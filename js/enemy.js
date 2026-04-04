// ── enemy.js ────────────────────────────────────────────────
// Enemy robots — clean finite state machine.
//
// States:
//   patrol     — moving along defined waypoints
//   suspicious — player spotted, detection meter filling
//   alert      — meter full, chasing player's last known position
//   search     — player escaped, walking to last known pos then scanning
//   disabled   — destroyed by bomb, stays on map but inert
//
// Update flow per enemy: sense → think → act
//
// Enemy variants (patrol / scanner / hunter) share all FSM logic;
// they differ only in speed, vision parameters, and body art.

const EnemyManager = (() => {

  const TS = Tilemap.TILE_SIZE;

  // ── Enemy type constants ──────────────────────────────────
  const TYPE = { PATROL: 'patrol', SCANNER: 'scanner', HUNTER: 'hunter' };

  // ── FSM state constants ───────────────────────────────────
  const STATE = {
    PATROL:     'patrol',
    SUSPICIOUS: 'suspicious',
    ALERT:      'alert',
    SEARCH:     'search',
    DISABLED:   'disabled',
  };

  // ── Tuning constants ──────────────────────────────────────

  // Detection meter must exceed this fraction when player escapes for the enemy
  // to enter search mode rather than simply draining back to patrol.
  const SEARCH_THRESHOLD = 0.45;

  // Seconds the enemy scans at the last known player position before returning
  // to patrol.
  const SEARCH_DURATION = 3.5;

  // How long (seconds) an alert enemy keeps chasing after losing sight of the
  // player before switching to search.
  const ALERT_LINGER = 1.2;

  // Pixel radius within which an alert enemy "catches" the player → game over.
  const ALERT_CATCH_RADIUS = TS * 0.85;
  const ALERT_CATCH_DIST_SQ = ALERT_CATCH_RADIUS * ALERT_CATCH_RADIUS;

  // Speed multiplier applied to alert enemies while chasing.
  const ALERT_SPEED_MULT = 1.4;

  // Fraction of _detectTime it takes the meter to fully drain when out of sight.
  const METER_DRAIN_RATIO = 0.65;

  // Hue range (°) for the detection-meter bar gradient (orange → red).
  const METER_HUE_MAX = 30;

  // Extra fog reveal radius around the player (tiles).
  const FOG_PEEK_RADIUS = 2;

  // ── Module state ──────────────────────────────────────────
  let _enemies = [];
  let _detected = false;  // true this frame when an alert enemy catches the player

  // Cached each frame for fog-reveal look-ahead.
  let _lastPlayerPx = -1;
  let _lastPlayerPy = -1;

  // ── Detection config (tunable via debug panel) ────────────
  let _detectTime = 0.8;  // seconds of continuous visibility to fill the meter
  let _coneScale  = 0.70; // scale factor applied to visionRange and visionAngle

  function setDetectTime(t) { _detectTime = Utils.clamp(+t || 0.8, 0.05, 30); }
  function setConeScale(s)  { _coneScale  = Utils.clamp(+s || 0.7, 0.1, 3.0); }
  function getDetectTime()  { return _detectTime; }
  function getConeScale()   { return _coneScale; }

  // ── Enemy factory ─────────────────────────────────────────
  function _makeEnemy(def) {
    const patrol  = def.patrol;
    const startPt = patrol[0];
    const px = startPt.col * TS + TS / 2;
    const py = startPt.row * TS + TS / 2;

    return {
      // --- Config (set once) ---
      type:        def.type || TYPE.PATROL,
      patrol,
      speed:       def.speed * TS,  // px/sec
      visionRange: def.visionRange,
      visionAngle: def.visionAngle, // half-angle in radians

      // --- Position / orientation ---
      px, py,
      facing: 0,  // radians

      // --- Patrol movement ---
      waypointIndex: 0,
      direction: 1,  // 1 = forward through waypoints, -1 = reverse

      // --- FSM ---
      state:           STATE.PATROL,
      detectionMeter:  0,    // 0–1; reaching 1 triggers ALERT
      lastKnownPx:     -1,
      lastKnownPy:     -1,
      alertLingerTimer: 0,   // countdown before ALERT → SEARCH when player OOS
      searchTimer:     0,    // countdown while scanning at last known pos

      // --- Visuals ---
      alertTimer:  0,        // drives the "!" indicator and body colour flash
      bobTimer:    Math.random() * Math.PI * 2,

      // --- Scanner-specific ---
      sweepTimer:  Math.random() * Math.PI * 2,
      sweepOffset: 0,
    };
  }

  function init(defs) {
    _enemies  = defs.map(_makeEnemy);
    _detected = false;
  }

  function wasDetected() { return _detected; }

  // Effective facing angle used for cone geometry (scanner oscillates).
  function _effectiveFacing(e) {
    return e.type === TYPE.SCANNER ? e.facing + e.sweepOffset : e.facing;
  }

  // ── Main update ───────────────────────────────────────────
  function update(dt, playerPx, playerPy) {
    _detected     = false;
    _lastPlayerPx = playerPx;
    _lastPlayerPy = playerPy;

    for (const e of _enemies) {
      if (e.state === STATE.DISABLED) continue;
      e.bobTimer += dt;
      if (e.alertTimer > 0) e.alertTimer -= dt;

      // Scanner sweep oscillation (active in all non-disabled states)
      if (e.type === TYPE.SCANNER) {
        e.sweepTimer  += dt;
        e.sweepOffset  = Math.sin(e.sweepTimer * 1.4) * (Math.PI / 3);
      }

      const inView = _sense(e, playerPx, playerPy);
      _think(e, inView, playerPx, playerPy, dt);
      _act(e, playerPx, playerPy, dt);
    }
  }

  // ── Sense ─────────────────────────────────────────────────
  // Returns true when the player is inside the vision cone with clear LOS.
  function _sense(e, playerPx, playerPy) {
    const scaledRange = e.visionRange * _coneScale;
    const scaledAngle = e.visionAngle * _coneScale;

    if (Utils.dist2(e.px, e.py, playerPx, playerPy) > scaledRange * scaledRange) return false;

    const angleToPlayer = Utils.angleTo(e.px, e.py, playerPx, playerPy);
    if (!Utils.angleInCone(angleToPlayer, _effectiveFacing(e), scaledAngle)) return false;

    return Tilemap.hasLineOfSight(e.px, e.py, playerPx, playerPy);
  }

  // ── Think ─────────────────────────────────────────────────
  // State transitions based on what the enemy senses.
  function _think(e, inView, playerPx, playerPy, dt) {
    // Always record the most recent visible player position.
    if (inView) {
      e.lastKnownPx = playerPx;
      e.lastKnownPy = playerPy;
    }

    // Advance the detection meter.
    if (inView) {
      e.detectionMeter = Math.min(1, e.detectionMeter + dt / _detectTime);
    } else {
      e.detectionMeter = Math.max(0, e.detectionMeter - dt / (_detectTime * METER_DRAIN_RATIO));
    }

    switch (e.state) {

      case STATE.PATROL: {
        if (inView) e.state = STATE.SUSPICIOUS;
        break;
      }

      case STATE.SUSPICIOUS: {
        if (e.detectionMeter >= 1) {
          // Meter full — enemy is now fully alert.
          e.state           = STATE.ALERT;
          e.alertTimer      = e.type === TYPE.HUNTER ? 1.0 : 0.6;
          e.alertLingerTimer = ALERT_LINGER;
        } else if (!inView) {
          if (e.detectionMeter > SEARCH_THRESHOLD) {
            // Player escaped while significantly suspicious → search.
            _enterSearch(e);
          } else if (e.detectionMeter <= 0) {
            // Meter fully drained → resume patrol.
            e.state = STATE.PATROL;
          }
          // Between 0 and SEARCH_THRESHOLD: remain suspicious while draining.
        }
        break;
      }

      case STATE.ALERT: {
        // Game over when close enough to catch the player.
        if (Utils.dist2(e.px, e.py, playerPx, playerPy) <= ALERT_CATCH_DIST_SQ) {
          _detected = true;
        }

        if (!inView) {
          e.alertLingerTimer -= dt;
          if (e.alertLingerTimer <= 0) {
            // Lost the player — start searching last known position.
            _enterSearch(e);
          }
        } else {
          // Reset linger timer while player remains visible.
          e.alertLingerTimer = ALERT_LINGER;
        }
        break;
      }

      case STATE.SEARCH: {
        if (inView) {
          // Re-spotted during search → become suspicious again (already warm).
          e.state           = STATE.SUSPICIOUS;
          e.detectionMeter  = Math.max(e.detectionMeter, SEARCH_THRESHOLD + 0.1);
          break;
        }

        const dx   = e.lastKnownPx - e.px;
        const dy   = e.lastKnownPy - e.py;
        const atPos = Math.sqrt(dx * dx + dy * dy) < TS * 0.6;

        if (atPos) {
          // Count down scan time at the last known position.
          e.searchTimer -= dt;
          if (e.searchTimer <= 0) {
            e.state          = STATE.PATROL;
            e.detectionMeter = 0;
            _resetToNearestWaypoint(e);
          }
        }
        break;
      }
    }
  }

  function _enterSearch(e) {
    e.state       = STATE.SEARCH;
    e.searchTimer = SEARCH_DURATION;
  }

  // ── Act ───────────────────────────────────────────────────
  // Movement execution for the current state.
  function _act(e, playerPx, playerPy, dt) {
    switch (e.state) {

      case STATE.PATROL:
      case STATE.SUSPICIOUS:
        _moveToWaypoint(e, dt);
        break;

      case STATE.ALERT: {
        // Chase the last known player position at increased speed.
        const tx = e.lastKnownPx >= 0 ? e.lastKnownPx : playerPx;
        const ty = e.lastKnownPy >= 0 ? e.lastKnownPy : playerPy;
        _moveToPixel(e, tx, ty, e.speed * ALERT_SPEED_MULT, dt);
        break;
      }

      case STATE.SEARCH: {
        const dx   = e.lastKnownPx - e.px;
        const dy   = e.lastKnownPy - e.py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > TS * 0.6) {
          // Still walking toward last known position.
          _moveToPixel(e, e.lastKnownPx, e.lastKnownPy, e.speed, dt);
        } else {
          // Arrived — slowly rotate to scan the surroundings.
          e.facing += (Math.PI * 2 / SEARCH_DURATION) * dt;
        }
        break;
      }
    }
  }

  // ── Movement helpers ──────────────────────────────────────

  // Advance toward the next patrol waypoint (ping-pong).
  function _moveToWaypoint(e, dt) {
    const target = e.patrol[e.waypointIndex];
    const tx = target.col * TS + TS / 2;
    const ty = target.row * TS + TS / 2;
    const dx = tx - e.px;
    const dy = ty - e.py;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      e.px = tx;
      e.py = ty;
      e.waypointIndex += e.direction;

      if (e.waypointIndex >= e.patrol.length) {
        e.waypointIndex = e.patrol.length - 2;
        e.direction = -1;
      } else if (e.waypointIndex < 0) {
        e.waypointIndex = 1;
        e.direction     = 1;
      }
    } else {
      const nx = dx / dist;
      const ny = dy / dist;
      e.facing  = Math.atan2(ny, nx);
      e.px     += nx * e.speed * dt;
      e.py     += ny * e.speed * dt;
    }
  }

  // Move directly toward a pixel position at the given speed.
  function _moveToPixel(e, tx, ty, speed, dt) {
    const dx   = tx - e.px;
    const dy   = ty - e.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;
    const nx = dx / dist;
    const ny = dy / dist;
    e.facing  = Math.atan2(ny, nx);
    e.px     += nx * speed * dt;
    e.py     += ny * speed * dt;
  }

  // Snap waypointIndex to whichever patrol point is nearest the enemy's
  // current position so patrol resumes naturally after a search.
  function _resetToNearestWaypoint(e) {
    let bestIdx  = 0;
    let bestDist = Infinity;
    for (let i = 0; i < e.patrol.length; i++) {
      const wp = e.patrol[i];
      const d  = Utils.dist2(e.px, e.py, wp.col * TS + TS / 2, wp.row * TS + TS / 2);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    e.waypointIndex = bestIdx;
    e.direction     = 1;
  }

  // ── Threat meter for slow-mo ──────────────────────────────
  // Returns 0–1 proximity threat used by game.js for the slow-mo effect.
  function getNearAlert(playerPx, playerPy) {
    let maxThreat = 0;
    for (const e of _enemies) {
      if (e.state === STATE.DISABLED) continue;

      // Alert enemies searching for the player always register moderate threat.
      if (e.state === STATE.ALERT) {
        const d = Math.sqrt(Utils.dist2(e.px, e.py, playerPx, playerPy));
        const r = e.visionRange * _coneScale * 1.3;
        if (d < r) maxThreat = Math.max(maxThreat, 0.55 + 0.45 * (1 - d / r));
        continue;
      }

      const dSq    = Utils.dist2(e.px, e.py, playerPx, playerPy);
      const outerR = e.visionRange * _coneScale * 1.3;
      if (dSq > outerR * outerR) continue;

      const angleToPlayer = Utils.angleTo(e.px, e.py, playerPx, playerPy);
      const angleDiff     = Math.abs(Utils.angleDiff(_effectiveFacing(e), angleToPlayer));
      const coneEdge      = e.visionAngle * _coneScale * 1.3;
      if (angleDiff > coneEdge) continue;

      const dist        = Math.sqrt(dSq);
      const rangeFactor = 1 - dist / outerR;
      const angleFactor = 1 - angleDiff / coneEdge;
      const threat      = rangeFactor * angleFactor;
      if (threat > maxThreat) maxThreat = threat;
    }
    return Utils.clamp(maxThreat, 0, 1);
  }

  // ── Fog visibility ────────────────────────────────────────
  function _isEnemyVisible(e) {
    if (FogManager.isExplored(Math.floor(e.px / TS), Math.floor(e.py / TS))) return true;
    if (FogManager.isEnabled() && _lastPlayerPx >= 0) {
      const peekR = FOG_PEEK_RADIUS * TS;
      const dx    = e.px - _lastPlayerPx;
      const dy    = e.py - _lastPlayerPy;
      if (dx * dx + dy * dy <= peekR * peekR) return true;
    }
    return false;
  }

  // ── Draw ──────────────────────────────────────────────────
  function draw(ctx) {
    // Vision cones first (drawn under bodies).
    for (const e of _enemies) {
      if (!_isEnemyVisible(e)) continue;
      if (e.state !== STATE.DISABLED) _drawVisionCone(ctx, e);
    }
    for (const e of _enemies) {
      if (!_isEnemyVisible(e)) continue;
      _drawEnemy(ctx, e);
    }
  }

  // ── Vision cone ───────────────────────────────────────────
  function _drawVisionCone(ctx, e) {
    const r         = e.visionRange * _coneScale;
    const halfAngle = e.visionAngle * _coneScale;
    const eFacing   = _effectiveFacing(e);

    ctx.save();
    ctx.translate(e.px, e.py);
    ctx.rotate(eFacing);

    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
    _fillConeGradient(grad, e);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, -halfAngle, halfAngle);
    ctx.closePath();
    ctx.fillStyle   = grad;
    ctx.fill();
    ctx.strokeStyle = _coneOutlineColor(e);
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.restore();
  }

  function _fillConeGradient(grad, e) {
    switch (e.state) {
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
        if (e.type === TYPE.SCANNER) {
          grad.addColorStop(0,    'rgba(80,120,255,0.50)');
          grad.addColorStop(0.45, 'rgba(60,90,220,0.22)');
          grad.addColorStop(1,    'rgba(40,60,180,0.0)');
        } else if (e.type === TYPE.HUNTER) {
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

  function _coneOutlineColor(e) {
    switch (e.state) {
      case STATE.ALERT:      return 'rgba(255,50,50,0.60)';
      case STATE.SEARCH:     return 'rgba(255,140,0,0.40)';
      case STATE.SUSPICIOUS: return 'rgba(255,190,0,0.45)';
      default:
        if (e.type === TYPE.SCANNER) return 'rgba(100,140,255,0.38)';
        if (e.type === TYPE.HUNTER)  return 'rgba(220,30,70,0.50)';
        return 'rgba(255,220,0,0.25)';
    }
  }

  // ── Enemy body ────────────────────────────────────────────
  function _drawEnemy(ctx, e) {
    const x = e.px;
    const y = e.py;
    const r = TS * 0.36;

    if (e.state === STATE.DISABLED) {
      _drawDisabledBody(ctx, x, y, r);
      return;
    }

    const isAlert = e.state === STATE.ALERT || e.alertTimer > 0;
    const bob     = Math.sin(e.bobTimer * 4.5) * 1.2;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(e.facing);
    if (e.type === TYPE.SCANNER)     _drawScannerBody(ctx, r, isAlert);
    else if (e.type === TYPE.HUNTER) _drawHunterBody(ctx, r, isAlert);
    else                             _drawPatrolBody(ctx, r, isAlert);
    ctx.shadowBlur = 0;
    ctx.restore();

    // ── State indicator above the robot ──
    if (e.state === STATE.ALERT || e.alertTimer > 0) {
      const alpha = Utils.clamp((e.alertTimer > 0 ? e.alertTimer : 0.6) / 0.4, 0, 1);
      ctx.save();
      ctx.globalAlpha = Math.min(alpha, 1);
      ctx.fillStyle   = '#ff3344';
      ctx.font        = 'bold 18px Courier New';
      ctx.textAlign   = 'center';
      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#ff0000';
      ctx.fillText('!', x, y - r - 10);
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (e.state === STATE.SEARCH) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle   = '#ffaa00';
      ctx.font        = 'bold 16px Courier New';
      ctx.textAlign   = 'center';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ff8800';
      ctx.fillText('?', x, y - r - 10);
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (e.state === STATE.SUSPICIOUS && e.detectionMeter > 0.15) {
      const alpha = Utils.clamp(e.detectionMeter * 1.4, 0, 0.9);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = '#ffcc00';
      ctx.font        = 'bold 14px Courier New';
      ctx.textAlign   = 'center';
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#ff8800';
      ctx.fillText('?', x, y - r - 10);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Detection meter bar ──
    const showMeter = e.detectionMeter > 0.05
      && e.state !== STATE.ALERT
      && e.state !== STATE.DISABLED;

    if (showMeter) {
      const barW = TS * 0.72;
      const barH = 4;
      const barX = x - barW / 2;
      const barY = y - r - 16;
      const hue  = Math.round(METER_HUE_MAX * (1 - e.detectionMeter));

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.shadowBlur  = 7;
      ctx.shadowColor = `hsl(${hue},100%,55%)`;
      ctx.fillStyle   = `hsl(${hue},100%,55%)`;
      ctx.fillRect(barX, barY, barW * e.detectionMeter, barH);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // ── Disabled body (bomb wreckage) ─────────────────────────
  function _drawDisabledBody(ctx, x, y, r) {
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);  // tilted on its side

    ctx.shadowBlur  = 6;
    ctx.shadowColor = '#ff6600';
    ctx.fillStyle   = '#4a3020';
    ctx.beginPath();
    ctx.roundRect(-r, -r, r * 2, r * 2, 4);
    ctx.fill();

    // Scorch mark X
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

  // ── PATROL body: orange square, amber eye ─────────────────
  function _drawPatrolBody(ctx, r, isAlert) {
    ctx.shadowBlur  = isAlert ? 24 : 14;
    ctx.shadowColor = isAlert ? '#ff3344' : '#ff6600';

    ctx.fillStyle = isAlert ? '#cc2233' : '#cc4400';
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

  // ── SCANNER body: blue rounded, triple sensor, antenna ────
  function _drawScannerBody(ctx, r, isAlert) {
    ctx.shadowBlur  = isAlert ? 28 : 16;
    ctx.shadowColor = isAlert ? '#ff3344' : '#4466ff';

    ctx.fillStyle = isAlert ? '#cc2233' : '#1133bb';
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
    ctx.moveTo(0, -r);
    ctx.lineTo(0, -r * 1.55);
    ctx.stroke();
    ctx.fillStyle = isAlert ? '#ff4466' : '#aaccff';
    ctx.beginPath();
    ctx.arc(0, -r * 1.55, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── HUNTER body: crimson diamond, laser eye, sharp nose ───
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
    ctx.moveTo(r * 0.92,  0);
    ctx.lineTo(r * 0.5,   5);
    ctx.lineTo(r * 0.5,  -5);
    ctx.closePath();
    ctx.fill();
  }

  // ── Bomb interaction ──────────────────────────────────────
  // Sets enemies within the blast radius to DISABLED rather than removing
  // them, so the wreckage remains visible on the map.
  function disableEnemiesInRadius(px, py, radius) {
    const r2 = radius * radius;
    for (const e of _enemies) {
      if (e.state === STATE.DISABLED) continue;
      if (Utils.dist2(e.px, e.py, px, py) <= r2) {
        e.state          = STATE.DISABLED;
        e.detectionMeter = 0;
      }
    }
  }

  // Legacy alias kept so bomb.js requires no change.
  function killEnemiesInRadius(px, py, radius) {
    disableEnemiesInRadius(px, py, radius);
  }

  function getEnemies() { return _enemies; }

  return {
    init, update, draw,
    wasDetected, getNearAlert, getEnemies,
    disableEnemiesInRadius, killEnemiesInRadius,
    TYPE, STATE,
    setDetectTime, setConeScale, getDetectTime, getConeScale,
  };
})();
