// ── player.js ───────────────────────────────────────────────
// Player robot: smooth grid-aligned movement, key/door interaction.

const Player = (() => {

  const TS = Tilemap.TILE_SIZE;

  // Grid position
  let _col = 0;
  let _row = 0;

  // Pixel position (for smooth interpolation)
  let _px = 0;
  let _py = 0;

  // Target pixel position
  let _tx = 0;
  let _ty = 0;

  // Movement interpolation
  const MOVE_DURATION = 0.12; // seconds per tile
  let _moveTimer = 0;
  let _moving = false;
  let _startPx = 0;
  let _startPy = 0;

  // Keys held
  let _keys = 0;

  // Visual
  let _facing = 0; // angle in radians (facing direction)
  let _bobTimer = 0;

  // Particles for step effect
  let _stepParticles = [];

  function init(col, row) {
    _col = col;
    _row = row;
    _px = col * TS + TS / 2;
    _py = row * TS + TS / 2;
    _tx = _px;
    _ty = _py;
    _moving = false;
    _moveTimer = 0;
    _keys = 0;
    _facing = 0;
    _bobTimer = 0;
    _stepParticles = [];
  }

  function getKeys() { return _keys; }
  function getCol()  { return _col; }
  function getRow()  { return _row; }
  function getPx()   { return _px; }
  function getPy()   { return _py; }

  function tryMove(dx, dy, onCollect, onOpenDoor, onExit) {
    if (_moving) return; // still moving

    const nc = _col + dx;
    const nr = _row + dy;

    if (Tilemap.isDoor(nc, nr)) {
      if (_keys > 0) {
        _keys--;
        Tilemap.openDoor(nc, nr);
        if (onOpenDoor) onOpenDoor(nc, nr);
      }
      return; // door blocks movement regardless
    }

    if (!Tilemap.isPassable(nc, nr)) return; // wall

    // Start movement
    _facing = Math.atan2(dy, dx);
    _col = nc;
    _row = nr;

    _startPx = _px;
    _startPy = _py;
    _tx = nc * TS + TS / 2;
    _ty = nr * TS + TS / 2;
    _moving = true;
    _moveTimer = 0;

    _spawnStepParticles();
  }

  function _spawnStepParticles() {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      _stepParticles.push({
        x: _px, y: _py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.3 + Math.random() * 0.2,
        size: 2 + Math.random() * 2,
      });
    }
  }

  function update(dt, onCollect, onExit) {
    _bobTimer += dt;

    // Update step particles
    for (let i = _stepParticles.length - 1; i >= 0; i--) {
      const p = _stepParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.85;
      p.vy *= 0.85;
      if (p.life <= 0) _stepParticles.splice(i, 1);
    }

    if (_moving) {
      _moveTimer += dt;
      const t = Utils.clamp(_moveTimer / MOVE_DURATION, 0, 1);
      // Smooth ease-out
      const ease = 1 - (1 - t) * (1 - t);
      _px = Utils.lerp(_startPx, _tx, ease);
      _py = Utils.lerp(_startPy, _ty, ease);

      if (t >= 1) {
        _px = _tx;
        _py = _ty;
        _moving = false;

        // Check tile events after arriving
        if (Tilemap.isKey(_col, _row)) {
          _keys++;
          Tilemap.removeKey(_col, _row);
          if (onCollect) onCollect(_col, _row);
        }
        if (Tilemap.isExit(_col, _row)) {
          if (onExit) onExit();
        }
      }
    }
  }

  function draw(ctx) {
    // Step particles
    for (const p of _stepParticles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `rgba(0,200,255,${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    const x = _px;
    const y = _py;
    const r = TS * 0.38;
    const bob = Math.sin(_bobTimer * 5) * 1.5;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(_facing);

    // Glow
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00ccff';

    // Body
    ctx.fillStyle = '#00aaff';
    ctx.beginPath();
    ctx.roundRect(-r, -r, r * 2, r * 2, 4);
    ctx.fill();

    // Inner panel
    ctx.fillStyle = '#003366';
    ctx.beginPath();
    ctx.roundRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2, 3);
    ctx.fill();

    // Eyes (two cyan dots)
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.25, -r * 0.15, 4, 0, Math.PI * 2);
    ctx.arc(r * 0.25, r * 0.15, 4, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator (bright nose)
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(r * 0.85, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function isMoving() { return _moving; }

  return {
    init, update, draw,
    tryMove, isMoving,
    getKeys, getCol, getRow, getPx, getPy
  };
})();
