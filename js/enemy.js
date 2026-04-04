// ── enemy.js ────────────────────────────────────────────────
// Enemy robots: patrol, vision cone, detection.
// Three types:
//   patrol  — standard orange guard, medium speed, forward cone
//   scanner — blue surveillance bot, slow, sweeping wide cone, short range
//   hunter  — crimson pursuit unit, fast, long-range narrow laser beam

const EnemyManager = (() => {

  const TS = Tilemap.TILE_SIZE;

  // ── Enemy type constants (exported for level definitions) ─
  const TYPE = { PATROL: 'patrol', SCANNER: 'scanner', HUNTER: 'hunter' };

  let _enemies = [];
  let _alertFlash = 0;    // seconds remaining for global alert flash
  let _detected  = false; // has detection occurred this frame?

  // ── Enemy constructor ────────────────────────────────────
  function _makeEnemy(def) {
    const patrol = def.patrol;
    const startPt = patrol[0];
    const px = startPt.col * TS + TS / 2;
    const py = startPt.row * TS + TS / 2;

    return {
      // Config
      type: def.type || TYPE.PATROL,
      patrol,
      speed: def.speed * TS,       // px/sec
      visionRange: def.visionRange,
      visionAngle: def.visionAngle, // half-angle

      // Movement state
      waypointIndex: 0,
      direction: 1,  // 1 = forward, -1 = reverse
      px, py,
      facing: 0,  // radians

      // Visual state
      alertTimer: 0,   // flash timer
      bobTimer: Math.random() * Math.PI * 2,

      // Scanner sweep state
      sweepTimer: Math.random() * Math.PI * 2,
      sweepOffset: 0,
    };
  }

  function init(defs) {
    _enemies = defs.map(_makeEnemy);
    _alertFlash = 0;
    _detected = false;
  }

  function wasDetected() { return _detected; }

  // Returns the effective facing angle used for detection and cone drawing.
  // Scanner cones oscillate side-to-side via sweepOffset.
  function _effectiveFacing(e) {
    return e.type === TYPE.SCANNER ? e.facing + e.sweepOffset : e.facing;
  }

  function update(dt, playerPx, playerPy) {
    _detected = false;
    if (_alertFlash > 0) _alertFlash -= dt;

    for (const e of _enemies) {
      e.bobTimer += dt;
      _updateMovement(e, dt);
      _checkDetection(e, playerPx, playerPy);
    }
  }

  function _updateMovement(e, dt) {
    // Scanner: update sweep oscillation — cone swings ±60° from facing
    if (e.type === TYPE.SCANNER) {
      e.sweepTimer += dt;
      e.sweepOffset = Math.sin(e.sweepTimer * 1.4) * (Math.PI / 3);
    }

    const patrol = e.patrol;
    const target = patrol[e.waypointIndex];
    const tx = target.col * TS + TS / 2;
    const ty = target.row * TS + TS / 2;

    const dx = tx - e.px;
    const dy = ty - e.py;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      // Reached waypoint — advance
      e.px = tx;
      e.py = ty;
      e.waypointIndex += e.direction;

      if (e.waypointIndex >= patrol.length) {
        e.waypointIndex = patrol.length - 2;
        e.direction = -1;
      } else if (e.waypointIndex < 0) {
        e.waypointIndex = 1;
        e.direction = 1;
      }
    } else {
      const nx = dx / dist;
      const ny = dy / dist;
      e.facing = Math.atan2(ny, nx);
      e.px += nx * e.speed * dt;
      e.py += ny * e.speed * dt;
    }

    if (e.alertTimer > 0) e.alertTimer -= dt;
  }

  function _checkDetection(e, playerPx, playerPy) {
    const dSq = Utils.dist2(e.px, e.py, playerPx, playerPy);
    if (dSq > e.visionRange * e.visionRange) return;

    const angleToPlayer = Utils.angleTo(e.px, e.py, playerPx, playerPy);
    // Use swept facing for scanner type
    if (!Utils.angleInCone(angleToPlayer, _effectiveFacing(e), e.visionAngle)) return;

    // LOS check
    if (!Tilemap.hasLineOfSight(e.px, e.py, playerPx, playerPy)) return;

    // Detection! Hunter has a longer alert flash for dramatic effect
    _detected = true;
    e.alertTimer = e.type === TYPE.HUNTER ? 1.0 : 0.6;
    _alertFlash = e.alertTimer;
  }

  // Returns 0-1 proximity alert for "near detection" slow-mo
  function getNearAlert(playerPx, playerPy) {
    let maxThreat = 0;
    for (const e of _enemies) {
      const dSq = Utils.dist2(e.px, e.py, playerPx, playerPy);
      const outerR = e.visionRange * 1.3;
      if (dSq > outerR * outerR) continue;

      const angleToPlayer = Utils.angleTo(e.px, e.py, playerPx, playerPy);
      const angleDiff = Math.abs(Utils.angleDiff(_effectiveFacing(e), angleToPlayer));
      const coneEdge = e.visionAngle * 1.3;
      if (angleDiff > coneEdge) continue;

      const dist = Math.sqrt(dSq);
      const rangeFactor = 1 - dist / outerR;
      const angleFactor = 1 - angleDiff / coneEdge;
      const threat = rangeFactor * angleFactor;
      if (threat > maxThreat) maxThreat = threat;
    }
    return Utils.clamp(maxThreat, 0, 1);
  }

  function draw(ctx) {
    for (const e of _enemies) {
      _drawVisionCone(ctx, e);
    }
    for (const e of _enemies) {
      _drawEnemy(ctx, e);
    }
  }

  function _drawVisionCone(ctx, e) {
    const isAlert = e.alertTimer > 0;
    const r = e.visionRange;
    const halfAngle = e.visionAngle;
    const eFacing = _effectiveFacing(e);

    ctx.save();
    ctx.translate(e.px, e.py);
    ctx.rotate(eFacing);

    // Gradient cone — colour varies by type
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
    if (isAlert) {
      grad.addColorStop(0,   'rgba(255,50,50,0.55)');
      grad.addColorStop(0.4, 'rgba(255,50,50,0.25)');
      grad.addColorStop(1,   'rgba(255,50,50,0.0)');
    } else if (e.type === TYPE.SCANNER) {
      grad.addColorStop(0,   'rgba(80,120,255,0.50)');
      grad.addColorStop(0.45,'rgba(60,90,220,0.22)');
      grad.addColorStop(1,   'rgba(40,60,180,0.0)');
    } else if (e.type === TYPE.HUNTER) {
      grad.addColorStop(0,   'rgba(255,20,60,0.65)');
      grad.addColorStop(0.5, 'rgba(200,10,50,0.28)');
      grad.addColorStop(1,   'rgba(140,0,30,0.0)');
    } else {
      // PATROL
      grad.addColorStop(0,   'rgba(255,220,0,0.35)');
      grad.addColorStop(0.4, 'rgba(255,200,0,0.15)');
      grad.addColorStop(1,   'rgba(255,200,0,0.0)');
    }

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, -halfAngle, halfAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Cone outline
    let outlineColor;
    if (isAlert)                      outlineColor = 'rgba(255,80,80,0.45)';
    else if (e.type === TYPE.SCANNER) outlineColor = 'rgba(100,140,255,0.38)';
    else if (e.type === TYPE.HUNTER)  outlineColor = 'rgba(220,30,70,0.50)';
    else                              outlineColor = 'rgba(255,220,0,0.25)';

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  function _drawEnemy(ctx, e) {
    const x = e.px;
    const y = e.py;
    const r = TS * 0.36;
    const isAlert = e.alertTimer > 0;
    const bob = Math.sin(e.bobTimer * 4.5) * 1.2;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(e.facing);

    if (e.type === TYPE.SCANNER) {
      _drawScannerBody(ctx, r, isAlert);
    } else if (e.type === TYPE.HUNTER) {
      _drawHunterBody(ctx, r, isAlert);
    } else {
      _drawPatrolBody(ctx, r, isAlert);
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // Alert "!" above robot
    if (isAlert) {
      const alpha = Utils.clamp(e.alertTimer / 0.4, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ff3344';
      ctx.font = 'bold 18px Courier New';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff0000';
      ctx.fillText('!', x, y - r - 10);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // ── PATROL: orange square body, single amber eye ──────────
  function _drawPatrolBody(ctx, r, isAlert) {
    ctx.shadowBlur = isAlert ? 24 : 14;
    ctx.shadowColor = isAlert ? '#ff3344' : '#ff6600';

    ctx.fillStyle = isAlert ? '#cc2233' : '#cc4400';
    ctx.beginPath();
    ctx.roundRect(-r, -r, r * 2, r * 2, 4);
    ctx.fill();

    ctx.fillStyle = isAlert ? '#550011' : '#441100';
    ctx.beginPath();
    ctx.roundRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2, 3);
    ctx.fill();

    // Eye — single glowing amber orb
    ctx.shadowBlur = 10;
    ctx.shadowColor = isAlert ? '#ff0000' : '#ffaa00';
    ctx.fillStyle = isAlert ? '#ff2244' : '#ffaa00';
    ctx.beginPath();
    ctx.arc(r * 0.2, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Nose indicator
    ctx.fillStyle = isAlert ? '#ff0000' : '#ff6600';
    ctx.beginPath();
    ctx.arc(r * 0.85, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── SCANNER: blue rounded body, triple eye row, antenna ───
  function _drawScannerBody(ctx, r, isAlert) {
    ctx.shadowBlur = isAlert ? 28 : 16;
    ctx.shadowColor = isAlert ? '#ff3344' : '#4466ff';

    // Highly-rounded body (near-circle)
    ctx.fillStyle = isAlert ? '#cc2233' : '#1133bb';
    ctx.beginPath();
    ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.55);
    ctx.fill();

    // Inner panel
    ctx.fillStyle = isAlert ? '#550011' : '#091840';
    ctx.beginPath();
    ctx.roundRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.1, r * 0.4);
    ctx.fill();

    // Three small scanner sensors in a vertical row on the front face
    ctx.shadowBlur = 8;
    ctx.shadowColor = isAlert ? '#ff0000' : '#88aaff';
    ctx.fillStyle   = isAlert ? '#ff2244' : '#88aaff';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(r * 0.22, i * r * 0.32, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Antenna (pointing perpendicular to facing = visible when robot moves)
    ctx.strokeStyle = isAlert ? '#ff2244' : '#6688ff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 5;
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

  // ── HUNTER: dark crimson diamond body, laser eye, sharp nose
  function _drawHunterBody(ctx, r, isAlert) {
    ctx.shadowBlur = isAlert ? 30 : 20;
    ctx.shadowColor = isAlert ? '#ff0000' : '#bb0022';

    // Diamond-shaped body: draw a square rotated 45°
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

    // Laser eye — horizontal glowing bar
    ctx.shadowBlur = 14;
    ctx.shadowColor = isAlert ? '#ff0000' : '#ff2244';
    ctx.fillStyle   = isAlert ? '#ff0000' : '#ff2244';
    ctx.beginPath();
    ctx.ellipse(r * 0.15, 0, r * 0.42, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sharp triangular nose
    ctx.shadowBlur = 8;
    ctx.fillStyle = isAlert ? '#ff4455' : '#cc1122';
    ctx.beginPath();
    ctx.moveTo(r * 0.92,  0);
    ctx.lineTo(r * 0.5,   5);
    ctx.lineTo(r * 0.5,  -5);
    ctx.closePath();
    ctx.fill();
  }

  function getEnemies() { return _enemies; }

  // Remove all enemies within radius of (px, py) — used by bomb explosions
  function killEnemiesInRadius(px, py, radius) {
    const r2 = radius * radius;
    for (let i = _enemies.length - 1; i >= 0; i--) {
      const e = _enemies[i];
      if (Utils.dist2(e.px, e.py, px, py) <= r2) {
        _enemies.splice(i, 1);
      }
    }
  }

  return { init, update, draw, wasDetected, getNearAlert, getEnemies, killEnemiesInRadius, TYPE };
})();
