// ── tilemap.js ──────────────────────────────────────────────
// Tile types, grid storage, collision, and rendering.
// Rendering is theme-aware — call setTheme() before drawing.

const Tilemap = (() => {

  // ── Tile constants ──────────────────────────────────────
  const TILE = {
    FLOOR:    0,
    WALL:     1,
    DOOR:     2,   // locked door (closed)
    DOOR_OPEN:3,   // open door (passable)
    KEY:      4,   // collectible key
    EXIT:     5,   // level exit
    AMMO:     6,   // bomb ammo pickup
  };

  const TILE_SIZE = 48; // px

  // State
  let _cols = 0;
  let _rows = 0;
  let _grid = [];   // flat array, row-major

  // Active theme (set per-level via setTheme)
  let _theme = null;

  function setTheme(theme) { _theme = theme; }
  function getTheme()      { return _theme; }

  function init(cols, rows, data) {
    _cols = cols;
    _rows = rows;
    _grid = data.slice();  // copy
  }

  function get(col, row) {
    if (col < 0 || row < 0 || col >= _cols || row >= _rows) return TILE.WALL;
    return _grid[row * _cols + col];
  }

  function set(col, row, type) {
    if (col < 0 || row < 0 || col >= _cols || row >= _rows) return;
    _grid[row * _cols + col] = type;
  }

  function isPassable(col, row) {
    const t = get(col, row);
    return t === TILE.FLOOR || t === TILE.DOOR_OPEN || t === TILE.KEY || t === TILE.EXIT || t === TILE.AMMO;
  }

  function isDoor(col, row)  { return get(col, row) === TILE.DOOR; }
  function isKey(col, row)   { return get(col, row) === TILE.KEY; }
  function isExit(col, row)  { return get(col, row) === TILE.EXIT; }
  function isAmmo(col, row)  { return get(col, row) === TILE.AMMO; }

  function openDoor(col, row) {
    if (get(col, row) === TILE.DOOR) set(col, row, TILE.DOOR_OPEN);
  }

  function removeKey(col, row) {
    if (get(col, row) === TILE.KEY) set(col, row, TILE.FLOOR);
  }

  function removeAmmo(col, row) {
    if (get(col, row) === TILE.AMMO) set(col, row, TILE.FLOOR);
  }

  function pixelWidth()  { return _cols * TILE_SIZE; }
  function pixelHeight() { return _rows * TILE_SIZE; }
  function cols() { return _cols; }
  function rows() { return _rows; }

  // ── Line-of-sight raycast ───────────────────────────────
  function hasLineOfSight(ax, ay, bx, by) {
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / (TILE_SIZE / 4);
    for (let i = 1; i <= steps; i++) {
      const t  = i / steps;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      const tile = get(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
      if (tile === TILE.WALL || tile === TILE.DOOR) return false;
    }
    return true;
  }

  // ── Animation ───────────────────────────────────────────
  let _blinkTimer = 0;
  let _blinkPhase = 0;

  // Per-theme animated accents: an array of { x, y, type } built once
  // per init and reused across frames to avoid GC pressure.
  let _wallAccents = [];

  function update(dt) {
    _blinkTimer += dt;
    _blinkPhase = (Math.sin(_blinkTimer * 3) + 1) / 2; // 0-1
  }

  // ── Main draw ────────────────────────────────────────────
  function draw(ctx) {
    const t  = _theme;
    const fc = t ? t.floorColor  : '#141428';
    const wc = t ? t.wallColor   : '#1a1a3a';
    const fg = t ? t.floorGrid   : 'rgba(255,255,255,0.03)';

    for (let row = 0; row < _rows; row++) {
      for (let col = 0; col < _cols; col++) {
        const x    = col * TILE_SIZE;
        const y    = row * TILE_SIZE;
        const tile = get(col, row);

        // Floor base for every tile
        ctx.fillStyle = fc;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        if (tile === TILE.WALL) {
          _drawWall(ctx, x, y);
        } else if (tile === TILE.DOOR) {
          _drawDoor(ctx, x, y);
        } else if (tile === TILE.KEY) {
          _drawKey(ctx, x, y);
        } else if (tile === TILE.EXIT) {
          _drawExit(ctx, x, y);
        } else if (tile === TILE.AMMO) {
          _drawAmmo(ctx, x, y);
        }

        // Subtle grid lines on passable tiles
        if (tile !== TILE.WALL) {
          ctx.strokeStyle = fg;
          ctx.lineWidth   = 0.5;
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  // ── Wall rendering ───────────────────────────────────────
  function _drawWall(ctx, x, y) {
    const s  = TILE_SIZE;
    const t  = _theme;
    const wc = t ? t.wallColor   : '#1a1a3a';
    const wh = t ? t.wallHighlight : '#2a2a55';
    const ws = t ? t.wallShadow  : '#0f0f22';
    const wi = t ? t.wallInner   : '#ffffff08';

    ctx.fillStyle = wc;
    ctx.fillRect(x, y, s, s);
    // Top highlight
    ctx.fillStyle = wh;
    ctx.fillRect(x, y, s, 3);
    ctx.fillRect(x, y, 3, s);
    // Bottom shadow
    ctx.fillStyle = ws;
    ctx.fillRect(x, y + s - 3, s, 3);
    ctx.fillRect(x + s - 3, y, 3, s);
    // Inner panel
    ctx.fillStyle = wi;
    ctx.fillRect(x + 6, y + 6, s - 12, s - 12);

    // Theme-specific wall decoration
    if (t) _drawWallFx(ctx, x, y, t);
  }

  // ── Theme wall decorations ───────────────────────────────
  function _drawWallFx(ctx, x, y, theme) {
    const s  = TILE_SIZE;
    const bp = _blinkPhase;
    const bt = _blinkTimer;

    switch (theme.wallFx) {

      case Themes.FX.CIRCUITS: {
        // Cyan circuit traces — thin L-shaped lines
        ctx.save();
        ctx.strokeStyle = `rgba(0,200,255,${0.18 + bp * 0.12})`;
        ctx.lineWidth   = 1;
        // Deterministic pattern from tile position
        const hx = ((x * 17 + y * 31) & 255) / 255;
        if (hx > 0.5) {
          ctx.beginPath();
          ctx.moveTo(x + 8,  y + s / 2);
          ctx.lineTo(x + 20, y + s / 2);
          ctx.lineTo(x + 20, y + 10);
          ctx.stroke();
          // small dot node
          ctx.fillStyle = `rgba(0,220,255,${0.4 + bp * 0.3})`;
          ctx.fillRect(x + 19, y + 9, 3, 3);
        } else {
          ctx.beginPath();
          ctx.moveTo(x + s - 8,  y + s / 2);
          ctx.lineTo(x + s - 20, y + s / 2);
          ctx.lineTo(x + s - 20, y + s - 10);
          ctx.stroke();
          ctx.fillStyle = `rgba(0,220,255,${0.4 + bp * 0.3})`;
          ctx.fillRect(x + s - 22, y + s - 11, 3, 3);
        }
        ctx.restore();
        break;
      }

      case Themes.FX.FROST: {
        // White frost crystal patterns — simple 6-arm snowflakes
        ctx.save();
        ctx.strokeStyle = `rgba(200,235,255,${0.20 + bp * 0.10})`;
        ctx.lineWidth   = 1;
        // Only decorate some walls deterministically
        const hy = ((x * 13 + y * 29) & 255) / 255;
        if (hy > 0.55) {
          const cx2 = x + s * 0.5, cy2 = y + s * 0.5;
          const arm = 8;
          for (let a = 0; a < 6; a++) {
            const ang = (a / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx2, cy2);
            ctx.lineTo(cx2 + Math.cos(ang) * arm, cy2 + Math.sin(ang) * arm);
            ctx.stroke();
            // mini branch
            const bx = cx2 + Math.cos(ang) * arm * 0.55;
            const by = cy2 + Math.sin(ang) * arm * 0.55;
            const ba = ang + Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(ba) * 4, by + Math.sin(ba) * 4);
            ctx.stroke();
          }
        }
        // Frost streak near top
        if (hy < 0.4) {
          ctx.strokeStyle = `rgba(180,220,255,${0.12 + bp * 0.08})`;
          ctx.beginPath();
          ctx.moveTo(x + 6, y + 4);
          ctx.lineTo(x + s - 6, y + 12);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }

      case Themes.FX.GRATE: {
        // Industrial rivet-and-grate pattern
        ctx.save();
        // Horizontal grate lines
        ctx.strokeStyle = `rgba(220,210,160,${0.10})`;
        ctx.lineWidth   = 1;
        for (let ly = y + 10; ly < y + s; ly += 10) {
          ctx.beginPath();
          ctx.moveTo(x + 4, ly);
          ctx.lineTo(x + s - 4, ly);
          ctx.stroke();
        }
        // Corner rivets
        ctx.fillStyle = `rgba(200,200,150,${0.22})`;
        const rv = 3;
        ctx.fillRect(x + 5,     y + 5,     rv, rv);
        ctx.fillRect(x + s-8,   y + 5,     rv, rv);
        ctx.fillRect(x + 5,     y + s - 8, rv, rv);
        ctx.fillRect(x + s - 8, y + s - 8, rv, rv);
        ctx.restore();
        break;
      }

      case Themes.FX.PLASMA: {
        // Glowing orange fracture cracks
        ctx.save();
        const hpx = ((x * 19 + y * 37) & 255) / 255;
        const glowA = 0.25 + bp * 0.25;
        ctx.shadowBlur  = 4 + bp * 6;
        ctx.shadowColor = `rgba(255,80,0,${glowA})`;
        ctx.strokeStyle = `rgba(255,${90 + (hpx * 60) | 0},0,${glowA + 0.1})`;
        ctx.lineWidth   = 1.2;
        // Random crack pattern seeded from tile position
        const seed = (x * 3 + y * 7) & 7;
        ctx.beginPath();
        if (seed < 3) {
          ctx.moveTo(x + 10, y + 6);
          ctx.lineTo(x + 22, y + 20);
          ctx.lineTo(x + 18, y + 34);
        } else if (seed < 6) {
          ctx.moveTo(x + s - 10, y + 8);
          ctx.lineTo(x + s - 18, y + 22);
          ctx.lineTo(x + s - 12, y + s - 8);
        } else {
          ctx.moveTo(x + 8,  y + s / 2);
          ctx.lineTo(x + 20, y + s / 2 - 8);
          ctx.lineTo(x + s - 8, y + s / 2 + 4);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        break;
      }

      case Themes.FX.ELECTRIC: {
        // Animated electric arcs — fast random zigzag sparks
        // Use blinkTimer to drive rapid flicker
        const phase = ((bt * 8) | 0) % 4; // 4 distinct frames at 8/s
        const hel   = ((x * 7 + y * 11 + phase) & 15) / 15;
        ctx.save();
        const arcA = 0.30 + bp * 0.35;
        ctx.strokeStyle = `rgba(80,160,255,${arcA})`;
        ctx.shadowBlur  = 5 + bp * 8;
        ctx.shadowColor = '#4499ff';
        ctx.lineWidth   = 1.5;

        // Arc pattern varies per tile and frame
        if (hel > 0.5) {
          const midY = y + s * 0.5 + (hel - 0.5) * 12;
          ctx.beginPath();
          ctx.moveTo(x + 4,     y + 6);
          ctx.lineTo(x + 14,    midY - 6);
          ctx.lineTo(x + 22,    midY + 4);
          ctx.lineTo(x + s - 4, y + s - 6);
          ctx.stroke();
        } else {
          const midX = x + s * 0.5 + (0.5 - hel) * 12;
          ctx.beginPath();
          ctx.moveTo(x + 6,     y + 4);
          ctx.lineTo(midX - 4,  y + 16);
          ctx.lineTo(midX + 4,  y + s - 16);
          ctx.lineTo(x + s - 6, y + s - 4);
          ctx.stroke();
        }

        // Bright corner sparks
        ctx.fillStyle = `rgba(180,220,255,${0.5 + bp * 0.4})`;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur  = 8;
        ctx.beginPath();
        ctx.arc(x + 3, y + 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + s - 3, y + s - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        break;
      }
    }
  }

  // ── Door ─────────────────────────────────────────────────
  function _drawDoor(ctx, x, y) {
    const s     = TILE_SIZE;
    const blink = _blinkPhase;
    ctx.fillStyle = `rgba(255,136,0,${0.7 + blink * 0.3})`;
    ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
    ctx.fillStyle = '#0d0d1f';
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(x + 6, y + (s / 4) * i - 1, s - 12, 2);
    }
    ctx.shadowBlur   = 10 * blink;
    ctx.shadowColor  = '#ff8800';
    ctx.strokeStyle  = `rgba(255,180,0,${0.6 + blink * 0.4})`;
    ctx.lineWidth    = 2;
    ctx.strokeRect(x + 4, y + 4, s - 8, s - 8);
    ctx.shadowBlur   = 0;
  }

  // ── Key ──────────────────────────────────────────────────
  function _drawKey(ctx, x, y) {
    const cx    = x + TILE_SIZE / 2;
    const cy    = y + TILE_SIZE / 2;
    const blink = _blinkPhase;
    const glow  = 6 + blink * 6;

    ctx.save();
    ctx.shadowBlur  = glow;
    ctx.shadowColor = '#ffee00';

    ctx.strokeStyle = `rgba(255,238,0,${0.8 + blink * 0.2})`;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(cx - 6, cy, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 1, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 7,  cy);
    ctx.lineTo(cx + 7,  cy + 5);
    ctx.moveTo(cx + 10, cy);
    ctx.lineTo(cx + 10, cy + 4);
    ctx.stroke();

    ctx.restore();
  }

  // ── Exit ─────────────────────────────────────────────────
  function _drawExit(ctx, x, y) {
    const s     = TILE_SIZE;
    const blink = _blinkPhase;
    const glow  = 8 + blink * 8;
    ctx.save();
    ctx.shadowBlur  = glow;
    ctx.shadowColor = '#00ffcc';

    ctx.strokeStyle = `rgba(0,255,204,${0.6 + blink * 0.4})`;
    ctx.lineWidth   = 2;
    ctx.strokeRect(x + 4, y + 4, s - 8, s - 8);

    const cx = x + s / 2, cy = y + s / 2;
    ctx.fillStyle = `rgba(0,255,204,${0.5 + blink * 0.4})`;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx - 8, cy + 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ── Ammo ─────────────────────────────────────────────────
  function _drawAmmo(ctx, x, y) {
    const cx    = x + TILE_SIZE / 2;
    const cy    = y + TILE_SIZE / 2;
    const blink = _blinkPhase;
    const glow  = 6 + blink * 8;

    ctx.save();
    ctx.shadowBlur  = glow;
    ctx.shadowColor = '#00ff88';

    ctx.strokeStyle = `rgba(0,255,136,${0.8 + blink * 0.2})`;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(0,200,100,${0.25 + blink * 0.15})`;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(0,255,136,${0.7 + blink * 0.3})`;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(cx,     cy - 7);
    ctx.lineTo(cx,     cy - 12);
    ctx.lineTo(cx + 5, cy - 16);
    ctx.stroke();

    ctx.fillStyle   = `rgba(255,255,100,${0.6 + blink * 0.4})`;
    ctx.shadowColor = '#ffff44';
    ctx.shadowBlur  = 5 + blink * 5;
    ctx.beginPath();
    ctx.arc(cx + 5, cy - 16, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  return {
    TILE, TILE_SIZE,
    init, get, set,
    setTheme, getTheme,
    isPassable, isDoor, isKey, isExit, isAmmo,
    openDoor, removeKey, removeAmmo,
    pixelWidth, pixelHeight, cols, rows,
    hasLineOfSight,
    update, draw
  };
})();
