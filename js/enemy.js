// ── enemy.js ──────────────────────────────────────────────────────────────
// Enemy AI — finite state machine built on a shared BaseEnemy class.
//
// Architecture
// ────────────
//   BaseEnemy (class)     per-enemy logic:  sense → think → act
//   EnemyManager (IIFE)   module wrapper:   owns the array, global flags, draw
//
// States
// ──────
//   patrol      moving between patrolPoints; brief wait at each point
//   suspicious  player is in the vision cone; detection meter filling
//   alert       meter full; chasing player's last-known position
//   search      player escaped; walking to last-known pos then scanning
//   disabled    temporarily incapacitated (reserved for future mechanics)
//   destroyed   permanently destroyed by bomb; wreckage stays on the map
//
// Detection
// ─────────
//   Detection is never instant.  A meter (0-1) fills while the player is
//   inside the vision cone (range + angle + line-of-sight checked every
//   frame).  When the meter reaches 1 the enemy enters ALERT.  When the
//   player leaves the cone the meter drains at METER_DRAIN_RATIO times the
//   fill rate; if the meter was above SEARCH_THRESHOLD the enemy enters
//   SEARCH instead of returning directly to PATROL.
//
// Extensibility
// ─────────────
//   All three variants (patrol / scanner / hunter) share every FSM path.
//   They differ only in constructor parameters.  New types require no new
//   code -- just pass different speed / visionRange / visionAngle values.

const EnemyManager = (() => {

  const TS = Tilemap.TILE_SIZE;

  // ── Type constants ───────────────────────────────────────────────────────
  const TYPE = {
    PATROL:  'patrol',
    SCANNER: 'scanner',
    HUNTER:  'hunter',
  };

  // ── FSM state constants ──────────────────────────────────────────────────
  const STATE = {
    PATROL:     'patrol',
    SUSPICIOUS: 'suspicious',
    ALERT:      'alert',
    SEARCH:     'search',
    DISABLED:   'disabled',   // temporary stun (reserved for future mechanics)
    DESTROYED:  'destroyed',  // permanent -- set by bomb explosions
  };

  // ── Tuning constants ─────────────────────────────────────────────────────

  // Detection meter must exceed this fraction when the player escapes for the
  // enemy to enter SEARCH rather than draining back to PATROL.
  const SEARCH_THRESHOLD = 0.45;

  // Seconds the enemy scans at the last-known position before resuming patrol.
  const SEARCH_DURATION = 3.5;

  // How long (s) an ALERT enemy keeps chasing after losing sight before
  // switching to SEARCH.
  const ALERT_LINGER = 1.2;

  // Pixel radius within which an ALERT enemy "catches" the player (game over).
  const ALERT_CATCH_RADIUS    = TS * 0.85;
  const ALERT_CATCH_RADIUS_SQ = ALERT_CATCH_RADIUS * ALERT_CATCH_RADIUS;

  // Speed multiplier applied while chasing in ALERT.
  const ALERT_SPEED_MULT = 1.4;

  // The meter drains at 1/DRAIN_RATIO of its fill rate when out of sight.
  const METER_DRAIN_RATIO = 0.65;

  // Extra fog-reveal radius (tiles) around the player.
  const FOG_PEEK_RADIUS = 2;

  // Hue range (degrees) for the detection-bar gradient (orange to red).
  const METER_HUE_MAX = 30;

  // ── Shared tunable config (debug panel) ──────────────────────────────────
  let _detectTime = 0.8;  // seconds of continuous visibility to fill the meter
  let _coneScale  = 0.70; // multiplier applied to visionRange and visionAngle

  function setDetectTime(t) { _detectTime = Utils.clamp(+t || 0.8, 0.05, 30); }
  function setConeScale(s)  { _coneScale  = Utils.clamp(+s || 0.7, 0.1, 3.0); }
  function getDetectTime()  { return _detectTime; }
  function getConeScale()   { return _coneScale; }

  // ── Module-level catch flag ───────────────────────────────────────────────
  // Set inside BaseEnemy.think() via the IIFE closure when an ALERT enemy
  // closes within catch distance of the player.
  let _caught       = false;
  let _lastPlayerPx = -1;
  let _lastPlayerPy = -1;

  // =========================================================================
  //  BaseEnemy class
  // =========================================================================
  class BaseEnemy {

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(def) {
      // Config -- set once, not mutated during gameplay
      this.type         = def.type || TYPE.PATROL;
      this.patrolPoints = def.patrol;           // [{col,row}, ...]
      this.speed        = def.speed * TS;       // px/s
      this.visionRange  = def.visionRange;      // px
      this.visionAngle  = def.visionAngle;      // half-angle, radians
      this.waitDuration = def.waitDuration != null ? def.waitDuration : 0.4;

      // Position / orientation
      const start = this.patrolPoints[0];
      this.px     = start.col * TS + TS / 2;
      this.py     = start.row * TS + TS / 2;
      this.facing = 0;  // radians

      // Patrol movement
      this._waypointIndex = 0;
      this._direction     = 1;   // +1 = forward, -1 = reverse
      this._waitTimer     = 0;   // countdown before advancing to next waypoint

      // FSM
      this.state             = STATE.PATROL;
      this.detectionMeter    = 0;   // 0-1; reaching 1 transitions to ALERT
      this.lastKnownPx       = -1;
      this.lastKnownPy       = -1;
      this._alertLingerTimer = 0;   // countdown after losing sight while ALERT
      this._searchTimer      = 0;   // countdown while scanning at last-known pos

      // Visuals
      this.alertTimer = 0;         // drives "!" flash above the body
      this.bobTimer   = Math.random() * Math.PI * 2;

      // Scanner sweep (only used for SCANNER type)
      this._sweepTimer  = Math.random() * Math.PI * 2;
      this._sweepOffset = 0;
    }

    // ── update: orchestrates sense -> think -> act ───────────────────────────
    update(dt, playerPx, playerPy) {
      if (this.state === STATE.DISABLED || this.state === STATE.DESTROYED) return;

      this.bobTimer += dt;
      if (this.alertTimer > 0) this.alertTimer -= dt;

      // Scanner cone oscillates independently of movement direction.
      if (this.type === TYPE.SCANNER) {
        this._sweepTimer  += dt;
        this._sweepOffset  = Math.sin(this._sweepTimer * 1.4) * (Math.PI / 3);
      }

      const inView = this.sense(playerPx, playerPy);
      this.think(inView, playerPx, playerPy, dt);
      this.act(dt);
    }

    // ── sense: perception ─────────────────────────────────────────────────────
    // Returns true when the player is inside the vision cone with clear LOS.
    // Detection depends on: vision range, vision angle, wall occlusion.
    sense(playerPx, playerPy) {
      const range = this.visionRange * _coneScale;
      const angle = this.visionAngle * _coneScale;

      // 1. Range check (cheap squared-distance)
      if (Utils.dist2(this.px, this.py, playerPx, playerPy) > range * range) return false;

      // 2. Angle check (vision cone)
      const toPlayer = Utils.angleTo(this.px, this.py, playerPx, playerPy);
      if (!Utils.angleInCone(toPlayer, this._effectiveFacing(), angle)) return false;

      // 3. Line-of-sight check (walls block vision)
      return Tilemap.hasLineOfSight(this.px, this.py, playerPx, playerPy);
    }

    // ── think: state transitions ──────────────────────────────────────────────
    // Advances the detection meter and drives all FSM transitions.
    think(inView, playerPx, playerPy, dt) {
      // Always record the most recent confirmed player position.
      if (inView) {
        this.lastKnownPx = playerPx;
        this.lastKnownPy = playerPy;
      }

      // Advance or decay the detection meter.
      if (inView) {
        this.detectionMeter = Math.min(1, this.detectionMeter + dt / _detectTime);
      } else {
        this.detectionMeter = Math.max(
          0, this.detectionMeter - dt / (_detectTime * METER_DRAIN_RATIO)
        );
      }

      switch (this.state) {

        case STATE.PATROL: {
          if (inView) this.state = STATE.SUSPICIOUS;
          break;
        }

        case STATE.SUSPICIOUS: {
          if (this.detectionMeter >= 1) {
            // Meter full -- enemy fully alerted.
            this.state             = STATE.ALERT;
            this.alertTimer        = this.type === TYPE.HUNTER ? 1.0 : 0.6;
            this._alertLingerTimer = ALERT_LINGER;
          } else if (!inView) {
            if (this.detectionMeter > SEARCH_THRESHOLD) {
              // Player escaped with a warm meter -> search last-known position.
              this._enterSearch();
            } else if (this.detectionMeter <= 0) {
              // Meter fully drained -> resume patrol.
              this.state = STATE.PATROL;
            }
            // Between 0 and SEARCH_THRESHOLD: stay suspicious while draining.
          }
          break;
        }

        case STATE.ALERT: {
          // Check whether this enemy has physically caught the player.
          if (Utils.dist2(this.px, this.py, playerPx, playerPy) <= ALERT_CATCH_RADIUS_SQ) {
            _caught = true;
          }

          if (!inView) {
            this._alertLingerTimer -= dt;
            if (this._alertLingerTimer <= 0) {
              this._enterSearch();
            }
          } else {
            this._alertLingerTimer = ALERT_LINGER;
          }
          break;
        }

        case STATE.SEARCH: {
          // Re-spotted during search -> suspicious again with a warm meter.
          if (inView) {
            this.state          = STATE.SUSPICIOUS;
            this.detectionMeter = Math.max(this.detectionMeter, SEARCH_THRESHOLD + 0.1);
            break;
          }

          // Count down the scan timer once we arrive at the last-known position.
          const dx    = this.lastKnownPx - this.px;
          const dy    = this.lastKnownPy - this.py;
          const atPos = Math.sqrt(dx * dx + dy * dy) < TS * 0.6;

          if (atPos) {
            this._searchTimer -= dt;
            if (this._searchTimer <= 0) {
              this.state          = STATE.PATROL;
              this.detectionMeter = 0;
              this._resetToNearestWaypoint();
            }
          }
          break;
        }
      }
    }

    // ── act: movement ─────────────────────────────────────────────────────────
    act(dt) {
      switch (this.state) {

        case STATE.PATROL:
        case STATE.SUSPICIOUS:
          // Suspicious enemies keep patrolling; only the cone colour changes.
          this._moveToWaypoint(dt);
          break;

        case STATE.ALERT: {
          const tx = this.lastKnownPx >= 0 ? this.lastKnownPx : this.px;
          const ty = this.lastKnownPy >= 0 ? this.lastKnownPy : this.py;
          this._moveToPixel(tx, ty, this.speed * ALERT_SPEED_MULT, dt);
          break;
        }

        case STATE.SEARCH: {
          const dx   = this.lastKnownPx - this.px;
          const dy   = this.lastKnownPy - this.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > TS * 0.6) {
            this._moveToPixel(this.lastKnownPx, this.lastKnownPy, this.speed, dt);
          } else {
            // Arrived -- rotate slowly to scan the surroundings.
            this.facing += (Math.PI * 2 / SEARCH_DURATION) * dt;
          }
          break;
        }
      }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    // Effective facing accounts for the scanner's oscillating sweep angle.
    _effectiveFacing() {
      return this.type === TYPE.SCANNER
        ? this.facing + this._sweepOffset
        : this.facing;
    }

    _enterSearch() {
      this.state        = STATE.SEARCH;
      this._searchTimer = SEARCH_DURATION;
    }

    // Ping-pong between waypoints with a brief wait at each point.
    _moveToWaypoint(dt) {
      if (this._waitTimer > 0) {
        this._waitTimer -= dt;
        return;
      }

      const wp   = this.patrolPoints[this._waypointIndex];
      const tx   = wp.col * TS + TS / 2;
      const ty   = wp.row * TS + TS / 2;
      const dx   = tx - this.px;
      const dy   = ty - this.py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        this.px             = tx;
        this.py             = ty;
        this._waitTimer     = this.waitDuration;
        this._waypointIndex += this._direction;

        if (this._waypointIndex >= this.patrolPoints.length) {
          this._waypointIndex = this.patrolPoints.length - 2;
          this._direction     = -1;
        } else if (this._waypointIndex < 0) {
          this._waypointIndex = 1;
          this._direction     = 1;
        }
      } else {
        const nx    = dx / dist;
        const ny    = dy / dist;
        this.facing = Math.atan2(ny, nx);
        this.px    += nx * this.speed * dt;
        this.py    += ny * this.speed * dt;
      }
    }

    // Move directly toward (tx, ty) at the given speed.
    _moveToPixel(tx, ty, speed, dt) {
      const dx   = tx - this.px;
      const dy   = ty - this.py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2) return;
      const nx    = dx / dist;
      const ny    = dy / dist;
      this.facing = Math.atan2(ny, nx);
      this.px    += nx * speed * dt;
      this.py    += ny * speed * dt;
    }

    // Snap the waypoint index to whichever patrol point is currently nearest
    // so the route resumes naturally after searching.
    _resetToNearestWaypoint() {
      let bestIdx  = 0;
      let bestDist = Infinity;
      for (let i = 0; i < this.patrolPoints.length; i++) {
        const wp = this.patrolPoints[i];
        const d  = Utils.dist2(
          this.px, this.py,
          wp.col * TS + TS / 2,
          wp.row * TS + TS / 2
        );
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      this._waypointIndex = bestIdx;
      this._direction     = 1;
    }

    // ── Drawing ───────────────────────────────────────────────────────────────

    drawCone(ctx) {
      if (this.state === STATE.DISABLED || this.state === STATE.DESTROYED) return;

      const r         = this.visionRange * _coneScale;
      const halfAngle = this.visionAngle * _coneScale;
      const facing    = this._effectiveFacing();

      ctx.save();
      ctx.translate(this.px, this.py);
      ctx.rotate(facing);

      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
      this._fillConeGradient(grad);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, -halfAngle, halfAngle);
      ctx.closePath();
      ctx.fillStyle   = grad;
      ctx.fill();
      ctx.strokeStyle = this._coneOutlineColor();
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.restore();
    }

    drawBody(ctx) {
      const x = this.px;
      const y = this.py;
      const r = TS * 0.36;

      if (this.state === STATE.DESTROYED || this.state === STATE.DISABLED) {
        _drawWreckage(ctx, x, y, r);
        return;
      }

      const isAlert = this.state === STATE.ALERT || this.alertTimer > 0;
      const bob     = Math.sin(this.bobTimer * 4.5) * 1.2;

      ctx.save();
      ctx.translate(x, y + bob);
      ctx.rotate(this.facing);
      if      (this.type === TYPE.SCANNER) _drawScannerBody(ctx, r, isAlert);
      else if (this.type === TYPE.HUNTER)  _drawHunterBody(ctx, r, isAlert);
      else                                 _drawPatrolBody(ctx, r, isAlert);
      ctx.shadowBlur = 0;
      ctx.restore();

      // State label above the robot.
      if (isAlert) {
        const a = Utils.clamp(
          (this.alertTimer > 0 ? this.alertTimer : 0.6) / 0.4, 0, 1
        );
        _drawStateLabel(ctx, '!', x, y - r - 10, '#ff3344', '#ff0000', Math.min(a, 1), 18);
      } else if (this.state === STATE.SEARCH) {
        _drawStateLabel(ctx, '?', x, y - r - 10, '#ffaa00', '#ff8800', 0.85, 16);
      } else if (this.state === STATE.SUSPICIOUS && this.detectionMeter > 0.15) {
        const a = Utils.clamp(this.detectionMeter * 1.4, 0, 0.9);
        _drawStateLabel(ctx, '?', x, y - r - 10, '#ffcc00', '#ff8800', a, 14);
      }

      // Detection meter bar (hidden once fully alerted).
      if (this.detectionMeter > 0.05 && this.state !== STATE.ALERT) {
        const barW = TS * 0.72;
        const barH = 4;
        const barX = x - barW / 2;
        const barY = y - r - 16;
        const hue  = Math.round(METER_HUE_MAX * (1 - this.detectionMeter));

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.shadowBlur  = 7;
        ctx.shadowColor = 'hsl(' + hue + ',100%,55%)';
        ctx.fillStyle   = 'hsl(' + hue + ',100%,55%)';
        ctx.fillRect(barX, barY, barW * this.detectionMeter, barH);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    _fillConeGradient(grad) {
      switch (this.state) {
        case STATE.ALERT:
          grad.addColorStop(0,   'rgba(255,30,30,0.65)');
          grad.addColorStop(0.4, 'rgba(255,30,30,0.30)');
          grad.addColorStop(1,   'rgba(255,30,30,0.0)');
          break;
        case STATE.SEARCH:
          grad.addColorStop(0,   'rgba(255,160,0,0.45)');
          grad.addColorStop(0.4, 'rgba(255,120,0,0.18)');
          grad.addColorStop(1,   'rgba(255,80,0,0.0)');
          break;
        case STATE.SUSPICIOUS:
          grad.addColorStop(0,   'rgba(255,200,0,0.50)');
          grad.addColorStop(0.4, 'rgba(255,160,0,0.22)');
          grad.addColorStop(1,   'rgba(255,120,0,0.0)');
          break;
        default:
          if (this.type === TYPE.SCANNER) {
            grad.addColorStop(0,    'rgba(80,120,255,0.50)');
            grad.addColorStop(0.45, 'rgba(60,90,220,0.22)');
            grad.addColorStop(1,    'rgba(40,60,180,0.0)');
          } else if (this.type === TYPE.HUNTER) {
            grad.addColorStop(0,   'rgba(255,20,60,0.65)');
            grad.addColorStop(0.5, 'rgba(200,10,50,0.28)');
            grad.addColorStop(1,   'rgba(140,0,30,0.0)');
          } else {
            grad.addColorStop(0,   'rgba(255,220,0,0.35)');
            grad.addColorStop(0.4, 'rgba(255,200,0,0.15)');
            grad.addColorStop(1,   'rgba(255,200,0,0.0)');
          }
      }
    }

    _coneOutlineColor() {
      switch (this.state) {
        case STATE.ALERT:      return 'rgba(255,50,50,0.60)';
        case STATE.SEARCH:     return 'rgba(255,140,0,0.40)';
        case STATE.SUSPICIOUS: return 'rgba(255,190,0,0.45)';
        default:
          if (this.type === TYPE.SCANNER) return 'rgba(100,140,255,0.38)';
          if (this.type === TYPE.HUNTER)  return 'rgba(220,30,70,0.50)';
          return 'rgba(255,220,0,0.25)';
      }
    }
  }
  // ── end class BaseEnemy ───────────────────────────────────────────────────


  // =========================================================================
  //  Shared drawing helpers  (pure functions, no per-enemy state)
  // =========================================================================

  function _drawStateLabel(ctx, text, x, y, fill, shadow, alpha, size) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = fill;
    ctx.font        = 'bold ' + size + 'px Courier New';
    ctx.textAlign   = 'center';
    ctx.shadowBlur  = size * 0.6;
    ctx.shadowColor = shadow;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function _drawWreckage(ctx, x, y, r) {
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);

    ctx.shadowBlur  = 6;
    ctx.shadowColor = '#ff6600';
    ctx.fillStyle   = '#4a3020';
    ctx.beginPath();
    ctx.roundRect(-r, -r, r * 2, r * 2, 4);
    ctx.fill();

    ctx.strokeStyle = '#ff6622';
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 4;
    ctx.shadowColor = '#ff4400';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.4); ctx.lineTo(r * 0.4,  r * 0.4);
    ctx.moveTo( r * 0.4, -r * 0.4); ctx.lineTo(-r * 0.4, r * 0.4);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function _drawPatrolBody(ctx, r, isAlert) {
    ctx.shadowBlur  = isAlert ? 24 : 14;
    ctx.shadowColor = isAlert ? '#ff3344' : '#ff6600';
    ctx.fillStyle   = isAlert ? '#cc2233' : '#cc4400';
    ctx.beginPath();
    ctx.roundRect(-r, -r, r * 2, r * 2, 4);
    ctx.fill();
    ctx.fillStyle = isAlert ? '#550011' : '#441100';
    ctx.beginPath();
    ctx.roundRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2, 3);
    ctx.fill();
    ctx.shadowBlur  = 10;
    ctx.shadowColor = isAlert ? '#ff0000' : '#ffaa00';
    ctx.fillStyle   = isAlert ? '#ff2244' : '#ffaa00';
    ctx.beginPath();
    ctx.arc(r * 0.2, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isAlert ? '#ff0000' : '#ff6600';
    ctx.beginPath();
    ctx.arc(r * 0.85, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function _drawScannerBody(ctx, r, isAlert) {
    ctx.shadowBlur  = isAlert ? 28 : 16;
    ctx.shadowColor = isAlert ? '#ff3344' : '#4466ff';
    ctx.fillStyle   = isAlert ? '#cc2233' : '#1133bb';
    ctx.beginPath();
    ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.55);
    ctx.fill();
    ctx.fillStyle = isAlert ? '#550011' : '#091840';
    ctx.beginPath();
    ctx.roundRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.1, r * 0.4);
    ctx.fill();
    ctx.shadowBlur  = 8;
    ctx.shadowColor = isAlert ? '#ff0000' : '#88aaff';
    ctx.fillStyle   = isAlert ? '#ff2244' : '#88aaff';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(r * 0.22, i * r * 0.32, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = isAlert ? '#ff2244' : '#6688ff';
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 5;
    ctx.shadowColor = isAlert ? '#ff2244' : '#6688ff';
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(0, -r * 1.55);
    ctx.stroke();
    ctx.fillStyle = isAlert ? '#ff4466' : '#aaccff';
    ctx.beginPath();
    ctx.arc(0, -r * 1.55, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function _drawHunterBody(ctx, r, isAlert) {
    ctx.shadowBlur  = isAlert ? 30 : 20;
    ctx.shadowColor = isAlert ? '#ff0000' : '#bb0022';
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = isAlert ? '#dd0011' : '#880011';
    ctx.beginPath();
    ctx.roundRect(-r * 0.82, -r * 0.82, r * 1.64, r * 1.64, 3);
    ctx.fill();
    ctx.fillStyle = isAlert ? '#660000' : '#3a0008';
    ctx.beginPath();
    ctx.roundRect(-r * 0.46, -r * 0.46, r * 0.92, r * 0.92, 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur  = 14;
    ctx.shadowColor = isAlert ? '#ff0000' : '#ff2244';
    ctx.fillStyle   = isAlert ? '#ff0000' : '#ff2244';
    ctx.beginPath();
    ctx.ellipse(r * 0.15, 0, r * 0.42, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 8;
    ctx.fillStyle  = isAlert ? '#ff4455' : '#cc1122';
    ctx.beginPath();
    ctx.moveTo(r * 0.92, 0); ctx.lineTo(r * 0.5, 5); ctx.lineTo(r * 0.5, -5);
    ctx.closePath();
    ctx.fill();
  }


  // =========================================================================
  //  EnemyManager -- public module API
  // =========================================================================

  let _enemies = [];

  function init(defs) {
    _enemies = defs.map(def => new BaseEnemy(def));
    _caught  = false;
  }

  function wasDetected() { return _caught; }

  function update(dt, playerPx, playerPy) {
    _caught       = false;
    _lastPlayerPx = playerPx;
    _lastPlayerPy = playerPy;

    for (const e of _enemies) {
      e.update(dt, playerPx, playerPy);
    }
  }

  // Two-pass draw: all cones first (behind bodies), then all bodies.
  function draw(ctx) {
    for (const e of _enemies) {
      if (_isVisible(e)) e.drawCone(ctx);
    }
    for (const e of _enemies) {
      if (_isVisible(e)) e.drawBody(ctx);
    }
  }

  function _isVisible(e) {
    if (FogManager.isExplored(Math.floor(e.px / TS), Math.floor(e.py / TS))) return true;
    if (FogManager.isEnabled() && _lastPlayerPx >= 0) {
      const peekPx = FOG_PEEK_RADIUS * TS;
      const dx = e.px - _lastPlayerPx;
      const dy = e.py - _lastPlayerPy;
      if (dx * dx + dy * dy <= peekPx * peekPx) return true;
    }
    return false;
  }

  function getNearAlert(playerPx, playerPy) {
    let maxThreat = 0;
    for (const e of _enemies) {
      if (e.state === STATE.DISABLED || e.state === STATE.DESTROYED) continue;

      if (e.state === STATE.ALERT) {
        const d = Math.sqrt(Utils.dist2(e.px, e.py, playerPx, playerPy));
        const r = e.visionRange * _coneScale * 1.3;
        if (d < r) maxThreat = Math.max(maxThreat, 0.55 + 0.45 * (1 - d / r));
        continue;
      }

      const dSq    = Utils.dist2(e.px, e.py, playerPx, playerPy);
      const outerR = e.visionRange * _coneScale * 1.3;
      if (dSq > outerR * outerR) continue;

      const toPlayer   = Utils.angleTo(e.px, e.py, playerPx, playerPy);
      const angleDiff  = Math.abs(Utils.angleDiff(e._effectiveFacing(), toPlayer));
      const coneEdge   = e.visionAngle * _coneScale * 1.3;
      if (angleDiff > coneEdge) continue;

      const dist        = Math.sqrt(dSq);
      const rangeFactor = 1 - dist / outerR;
      const angleFactor = 1 - angleDiff / coneEdge;
      maxThreat         = Math.max(maxThreat, rangeFactor * angleFactor);
    }
    return Utils.clamp(maxThreat, 0, 1);
  }

  // Permanently destroys all enemies within the blast radius; wreckage remains
  // visible on the map so the player can see the result of their bomb.
  function destroyEnemiesInRadius(px, py, radius) {
    const r2 = radius * radius;
    for (const e of _enemies) {
      if (e.state === STATE.DESTROYED) continue;
      if (Utils.dist2(e.px, e.py, px, py) <= r2) {
        e.state          = STATE.DESTROYED;
        e.detectionMeter = 0;
      }
    }
  }

  // Legacy aliases so bomb.js and any other callers need no changes.
  function disableEnemiesInRadius(px, py, radius) { destroyEnemiesInRadius(px, py, radius); }
  function killEnemiesInRadius(px, py, radius)    { destroyEnemiesInRadius(px, py, radius); }

  function getEnemies() { return _enemies; }

  return {
    init, update, draw,
    wasDetected, getNearAlert, getEnemies,
    destroyEnemiesInRadius, disableEnemiesInRadius, killEnemiesInRadius,
    TYPE, STATE,
    setDetectTime, setConeScale, getDetectTime, getConeScale,
  };
})();
