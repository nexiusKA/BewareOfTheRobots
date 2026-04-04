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

  // Bomb ammo
  const MAX_BOMB_AMMO = 5;
  let _bombAmmo = 0;

  // Particles for ammo pickup burst
  let _ammoParticles = [];

  // Visual
  let _facing = 0; // angle in radians (facing direction)
  let _bobTimer = 0;

  // Particles for step effect
  let _stepParticles = [];

  // Particles for key pickup burst
  let _keyParticles = [];

  // Ghost mode — allows movement through walls
  let _ghostMode = false;

  // Demolition perk — bombs destroy walls
  let _hasDemolition = false;
  let _demoParticles = [];

  function init(col, row, startBombs) {
    _col = col;
    _row = row;
    _px = col * TS + TS / 2;
    _py = row * TS + TS / 2;
    _tx = _px;
    _ty = _py;
    _moving = false;
    _moveTimer = 0;
    _keys = 0;
    _bombAmmo = Utils.clamp(startBombs || 0, 0, MAX_BOMB_AMMO);
    _facing = 0;
    _bobTimer = 0;
    _stepParticles = [];
    _keyParticles = [];
    _ammoParticles = [];
    _hasDemolition = false;
    _demoParticles = [];
  }

  function getKeys()     { return _keys; }
  function getCol()      { return _col; }
  function getRow()      { return _row; }
  function getPx()       { return _px; }
  function getPy()       { return _py; }
  function getBombAmmo() { return _bombAmmo; }
  function setGhostMode(enabled) { _ghostMode = enabled; }
  function isGhostMode()         { return _ghostMode; }
  function hasDemolition()       { return _hasDemolition; }

  function addBombAmmo(n) {
    _bombAmmo = Utils.clamp(_bombAmmo + n, 0, MAX_BOMB_AMMO);
  }

  function useBomb() {
    if (_bombAmmo > 0) { _bombAmmo--; return true; }
    return false;
  }

  function tryMove(dx, dy, onCollect, onOpenDoor, onExit) {
    if (_moving) return; // still moving

    const nc = _col + dx;
    const nr = _row + dy;

    if (_ghostMode) {
      // Ghost mode: only block movement at map boundaries
      if (nc < 0 || nr < 0 || nc >= Tilemap.cols() || nr >= Tilemap.rows()) return;
    } else {
      if (Tilemap.isDoor(nc, nr)) {
        if (_keys > 0) {
          _keys--;
          Tilemap.openDoor(nc, nr);
          if (onOpenDoor) onOpenDoor(nc, nr);
        }
        return; // door blocks movement regardless
      }

      if (!Tilemap.isPassable(nc, nr)) return; // wall
    }

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

    Sound.move();
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

  function _spawnKeyParticles(px, py) {
    const colors = ['#ffee00', '#ffffff', '#ffe880', '#ffcc00', '#fffacd'];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 50 + Math.random() * 100;
      const life = 0.45 + Math.random() * 0.35;
      _keyParticles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function _spawnAmmoParticles(px, py) {
    const colors = ['#00ff88', '#ffffff', '#44ffaa', '#00cc66', '#ccffee'];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 45 + Math.random() * 85;
      const life  = 0.4 + Math.random() * 0.3;
      _ammoParticles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 2.5 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function _spawnDemolitionParticles(px, py) {
    const colors = ['#ff6600', '#ffaa00', '#ff3300', '#ffffff', '#ffcc44'];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 55 + Math.random() * 110;
      const life  = 0.5 + Math.random() * 0.4;
      _demoParticles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function update(dt, onCollect, onExit, onAmmoCollect) {
    _bobTimer += dt;

    // Update step particles
    for (let i = _stepParticles.length - 1; i >= 0; i--) {
      const p = _stepParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      const damp = Math.pow(0.85, dt * 60);
      p.vx *= damp;
      p.vy *= damp;
      if (p.life <= 0) _stepParticles.splice(i, 1);
    }

    // Update key pickup particles
    for (let i = _keyParticles.length - 1; i >= 0; i--) {
      const p = _keyParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      const damp = Math.pow(0.90, dt * 60);
      p.vx *= damp;
      p.vy *= damp;
      if (p.life <= 0) _keyParticles.splice(i, 1);
    }

    // Update ammo pickup particles
    for (let i = _ammoParticles.length - 1; i >= 0; i--) {
      const p = _ammoParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      const damp = Math.pow(0.88, dt * 60);
      p.vx *= damp;
      p.vy *= damp;
      if (p.life <= 0) _ammoParticles.splice(i, 1);
    }

    // Update demolition perk pickup particles
    for (let i = _demoParticles.length - 1; i >= 0; i--) {
      const p = _demoParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      const damp = Math.pow(0.85, dt * 60);
      p.vx *= damp;
      p.vy *= damp;
      if (p.life <= 0) _demoParticles.splice(i, 1);
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
          _spawnKeyParticles(_tx, _ty);
          if (onCollect) onCollect(_col, _row);
        }
        if (Tilemap.isAmmo(_col, _row)) {
          addBombAmmo(2);
          Tilemap.removeAmmo(_col, _row);
          _spawnAmmoParticles(_tx, _ty);
          if (onAmmoCollect) onAmmoCollect();
        }
        if (Tilemap.isDemolitionPerk(_col, _row)) {
          _hasDemolition = true;
          Tilemap.removeDemolitionPerk(_col, _row);
          _spawnDemolitionParticles(_tx, _ty);
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

    // Key pickup burst particles
    if (_keyParticles.length > 0) {
      ctx.save();
      for (const p of _keyParticles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffee00';
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Ammo pickup burst particles
    if (_ammoParticles.length > 0) {
      ctx.save();
      for (const p of _ammoParticles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 7;
        ctx.shadowColor = '#00ff88';
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Demolition perk pickup burst particles
    if (_demoParticles.length > 0) {
      ctx.save();
      for (const p of _demoParticles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 9;
        ctx.shadowColor = '#ff6600';
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
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

    // Demolition-perk active ring (orange pulsing outer ring)
    if (_hasDemolition) {
      const pulse = (Math.sin(_bobTimer * 6) + 1) / 2;
      ctx.strokeStyle = `rgba(255,${80 + (pulse * 80) | 0},0,${0.55 + pulse * 0.35})`;
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur  = 10 + pulse * 10;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur  = 18;
      ctx.shadowColor = '#00ccff';
    }

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
    getKeys, getCol, getRow, getPx, getPy,
    getBombAmmo, addBombAmmo, useBomb,
    setGhostMode, isGhostMode,
    hasDemolition
  };
})();
