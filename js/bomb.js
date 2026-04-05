// ── bomb.js ─────────────────────────────────────────────────
// Bomb placement, fuse countdown, explosion, and visual effects.

const BombManager = (() => {

  const TS = Tilemap.TILE_SIZE;

  const FUSE_TIME        = 1.2;  // seconds until explosion
  const EXPLODE_RADIUS   = TS * 2.6;   // ~125px
  const EXPLODE_DURATION = 0.55; // seconds the flash/ring is visible

  let _bombs     = [];
  let _particles = [];
  let _fuseTimer = 0; // internal clock for fuse pulse animation
  let _pendingExplosion = false; // set true when any bomb detonates this frame

  function init() {
    _bombs     = [];
    _particles = [];
    _fuseTimer = 0;
    _pendingExplosion = false;
  }

  // Consume the explosion-shake signal; returns true if a bomb detonated since
  // the last call and resets the flag.
  function takeExplosionShake() {
    const v = _pendingExplosion;
    _pendingExplosion = false;
    return v;
  }

  // Place a bomb at pixel position (px, py)
  function placeBomb(px, py) {
    _bombs.push({
      px,
      py,
      timer:        FUSE_TIME,
      exploding:    false,
      explodeTimer: 0,
      radius:       EXPLODE_RADIUS,
    });
    _spawnPlacementParticles(px, py);
  }

  function update(dt) {
    _fuseTimer += dt;

    for (let i = _bombs.length - 1; i >= 0; i--) {
      const b = _bombs[i];

      if (!b.exploding) {
        b.timer -= dt;
        if (b.timer <= 0) {
          // Detonate
          b.exploding    = true;
          b.explodeTimer = EXPLODE_DURATION;
          _pendingExplosion = true;
          EnemyManager.applyBlastInRadius(b.px, b.py, b.radius);
          if (typeof PuzzleManager !== 'undefined') {
            PuzzleManager.onBombBlast(b.px, b.py, b.radius);
          }
          _spawnExplosionParticles(b.px, b.py);
          Sound.bombDetonate();
        }
      } else {
        b.explodeTimer -= dt;
        if (b.explodeTimer <= 0) {
          _bombs.splice(i, 1);
        }
      }
    }

    // Update particles
    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];
      p.x   += p.vx * dt;
      p.y   += p.vy * dt;
      p.life -= dt;
      const damp = Math.pow(0.78, dt * 60);
      p.vx *= damp;
      p.vy *= damp;
      if (p.life <= 0) _particles.splice(i, 1);
    }
  }

  function _spawnPlacementParticles(px, py) {
    const colors = ['#00ff88', '#ffffff', '#88ffcc', '#ffee44'];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const speed = 30 + Math.random() * 60;
      const life  = 0.2 + Math.random() * 0.2;
      _particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        placement: true,
      });
    }
  }

  function _spawnExplosionParticles(px, py) {
    const colors = ['#ff8800', '#ffdd00', '#ff4400', '#ffffff', '#ffcc44'];
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 55 + Math.random() * 155;
      const life  = 0.35 + Math.random() * 0.45;
      _particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 2.5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function draw(ctx) {
    // ── Explosion particles ─────────────────────────────────
    if (_particles.length > 0) {
      ctx.save();
      for (const p of _particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur  = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.3 + alpha * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
      ctx.restore();
    }

    // ── Bombs ───────────────────────────────────────────────
    for (const b of _bombs) {
      if (b.exploding) {
        _drawExplosion(ctx, b);
      } else {
        _drawFuse(ctx, b);
      }
    }
  }

  function _drawExplosion(ctx, b) {
    const t     = 1 - b.explodeTimer / EXPLODE_DURATION; // 0→1 as ring expands
    const alpha = b.explodeTimer / EXPLODE_DURATION;      // 1→0 as it fades
    const r     = b.radius * t;

    ctx.save();

    // Expanding shockwave ring
    ctx.strokeStyle = `rgba(255,180,30,${alpha * 0.9})`;
    ctx.lineWidth   = 5 * alpha;
    ctx.shadowBlur  = 28 * alpha;
    ctx.shadowColor = '#ff8800';
    ctx.beginPath();
    ctx.arc(b.px, b.py, Math.max(r, 1), 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright core flash (fades quickly)
    const coreAlpha = Math.max(0, alpha * 2 - 1); // only first half
    if (coreAlpha > 0) {
      ctx.fillStyle = `rgba(255,240,150,${coreAlpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(b.px, b.py, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function _drawFuse(ctx, b) {
    const fuseRatio = b.timer / FUSE_TIME; // 1→0 as fuse burns
    const urgent    = fuseRatio < 0.4;
    const pulse     = (Math.sin(_fuseTimer * (urgent ? 18 : 8)) + 1) / 2;

    const bodyColor = urgent ? '#ff2200' : '#ff8800';
    const glowColor = urgent ? '#ff2200' : '#ff8800';

    ctx.save();

    // Outer glow ring
    ctx.strokeStyle = `rgba(255,${urgent ? 34 : 136},0,${0.3 + pulse * 0.3})`;
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 8 + pulse * 10;
    ctx.shadowColor = glowColor;
    ctx.beginPath();
    ctx.arc(b.px, b.py, 13, 0, Math.PI * 2);
    ctx.stroke();

    // Body fill
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(b.px, b.py, 9, 0, Math.PI * 2);
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = `rgba(255,255,255,${0.35 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(b.px - 2.5, b.py - 2.5, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Fuse arc (remaining fuse shown as arc around bomb)
    ctx.strokeStyle = `rgba(255,255,100,${0.5 + pulse * 0.5})`;
    ctx.lineWidth   = 2.5;
    ctx.shadowBlur  = 5 + pulse * 8;
    ctx.shadowColor = '#ffff44';
    ctx.beginPath();
    ctx.arc(b.px, b.py, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fuseRatio);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function getBombs() { return _bombs; }

  return { init, placeBomb, update, draw, getBombs, takeExplosionShake };
})();
