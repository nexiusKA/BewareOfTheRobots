// ── enemy.js ────────────────────────────────────────────────
// Enemy robots: patrol, vision cone, detection.

const EnemyManager = (() => {

  const TS = Tilemap.TILE_SIZE;

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
    };
  }

  function init(defs) {
    _enemies = defs.map(_makeEnemy);
    _alertFlash = 0;
    _detected = false;
  }

  function wasDetected() { return _detected; }

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
    if (!Utils.angleInCone(angleToPlayer, e.facing, e.visionAngle)) return;

    // LOS check
    if (!Tilemap.hasLineOfSight(e.px, e.py, playerPx, playerPy)) return;

    // Detection!
    _detected = true;
    e.alertTimer = 0.6;
    _alertFlash = 0.6;
  }

  // Returns 0-1 proximity alert for "near detection" slow-mo
  function getNearAlert(playerPx, playerPy) {
    let maxThreat = 0;
    for (const e of _enemies) {
      const dSq = Utils.dist2(e.px, e.py, playerPx, playerPy);
      const outerR = e.visionRange * 1.3;
      if (dSq > outerR * outerR) continue;

      const angleToPlayer = Utils.angleTo(e.px, e.py, playerPx, playerPy);
      const angleDiff = Math.abs(Utils.angleDiff(e.facing, angleToPlayer));
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

    ctx.save();
    ctx.translate(e.px, e.py);
    ctx.rotate(e.facing);

    // Gradient cone
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
    if (isAlert) {
      grad.addColorStop(0,   'rgba(255,50,50,0.55)');
      grad.addColorStop(0.4, 'rgba(255,50,50,0.25)');
      grad.addColorStop(1,   'rgba(255,50,50,0.0)');
    } else {
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
    ctx.strokeStyle = isAlert ? 'rgba(255,80,80,0.4)' : 'rgba(255,220,0,0.25)';
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

    // Glow
    ctx.shadowBlur = isAlert ? 24 : 14;
    ctx.shadowColor = isAlert ? '#ff3344' : '#ff6600';

    // Body
    ctx.fillStyle = isAlert ? '#cc2233' : '#cc4400';
    ctx.beginPath();
    ctx.roundRect(-r, -r, r * 2, r * 2, 4);
    ctx.fill();

    // Inner panel
    ctx.fillStyle = isAlert ? '#550011' : '#441100';
    ctx.beginPath();
    ctx.roundRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2, 3);
    ctx.fill();

    // Eye — single glowing red/amber orb
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

  return { init, update, draw, wasDetected, getNearAlert, getEnemies, killEnemiesInRadius };
})();
