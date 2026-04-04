// ── tilemap.js ──────────────────────────────────────────────
// Tile types, grid storage, collision, and rendering.

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

  // Tile colours
  const COLOURS = {
    [TILE.WALL]:      '#1a1a3a',
    [TILE.FLOOR]:     '#141428',
    [TILE.DOOR]:      '#ff8800',
    [TILE.DOOR_OPEN]: '#141428',
    [TILE.KEY]:       '#ffee00',
    [TILE.EXIT]:      '#00ffcc',
    [TILE.AMMO]:      '#00ff88',
  };

  const TILE_SIZE = 48; // px

  // State
  let _cols = 0;
  let _rows = 0;
  let _grid = [];   // flat array, row-major

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

  function isDoor(col, row) {
    return get(col, row) === TILE.DOOR;
  }

  function isKey(col, row) {
    return get(col, row) === TILE.KEY;
  }

  function isExit(col, row) {
    return get(col, row) === TILE.EXIT;
  }

  function isAmmo(col, row) {
    return get(col, row) === TILE.AMMO;
  }

  function openDoor(col, row) {
    if (get(col, row) === TILE.DOOR) {
      set(col, row, TILE.DOOR_OPEN);
    }
  }

  function removeKey(col, row) {
    if (get(col, row) === TILE.KEY) {
      set(col, row, TILE.FLOOR);
    }
  }

  function removeAmmo(col, row) {
    if (get(col, row) === TILE.AMMO) {
      set(col, row, TILE.FLOOR);
    }
  }

  // Returns pixel width/height of the whole map
  function pixelWidth()  { return _cols * TILE_SIZE; }
  function pixelHeight() { return _rows * TILE_SIZE; }
  function cols() { return _cols; }
  function rows() { return _rows; }

  // ── Line-of-sight raycast on the tile grid ──────────────
  // Returns true if (ax,ay) can "see" (bx,by) without a wall in between.
  // Coords are in pixel-space.
  function hasLineOfSight(ax, ay, bx, by) {
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / (TILE_SIZE / 4);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      const col = Math.floor(px / TILE_SIZE);
      const row = Math.floor(py / TILE_SIZE);
      const tile = get(col, row);
      if (tile === TILE.WALL || tile === TILE.DOOR) return false;
    }
    return true;
  }

  // ── Rendering ────────────────────────────────────────────
  let _blinkTimer = 0;
  let _blinkPhase = 0;

  function update(dt) {
    _blinkTimer += dt;
    _blinkPhase = (Math.sin(_blinkTimer * 3) + 1) / 2; // 0-1
  }

  function draw(ctx) {
    for (let row = 0; row < _rows; row++) {
      for (let col = 0; col < _cols; col++) {
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const tile = get(col, row);

        // Floor base
        ctx.fillStyle = COLOURS[TILE.FLOOR];
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

        // Subtle grid lines on floor
        if (tile === TILE.FLOOR || tile === TILE.DOOR_OPEN || tile === TILE.KEY || tile === TILE.EXIT || tile === TILE.AMMO) {
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  function _drawWall(ctx, x, y) {
    const s = TILE_SIZE;
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(x, y, s, s);
    // Top highlight
    ctx.fillStyle = '#2a2a55';
    ctx.fillRect(x, y, s, 3);
    // Left highlight
    ctx.fillRect(x, y, 3, s);
    // Bottom shadow
    ctx.fillStyle = '#0f0f22';
    ctx.fillRect(x, y + s - 3, s, 3);
    ctx.fillRect(x + s - 3, y, 3, s);
    // Inner pattern
    ctx.fillStyle = '#ffffff08';
    ctx.fillRect(x + 6, y + 6, s - 12, s - 12);
  }

  function _drawDoor(ctx, x, y) {
    const s = TILE_SIZE;
    const blink = _blinkPhase;
    ctx.fillStyle = `rgba(255,136,0,${0.7 + blink * 0.3})`;
    ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
    // Horizontal bars
    ctx.fillStyle = '#0d0d1f';
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(x + 6, y + (s / 4) * i - 1, s - 12, 2);
    }
    // Glow
    ctx.shadowBlur = 10 * blink;
    ctx.shadowColor = '#ff8800';
    ctx.strokeStyle = `rgba(255,180,0,${0.6 + blink * 0.4})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, s - 8, s - 8);
    ctx.shadowBlur = 0;
  }

  function _drawKey(ctx, x, y) {
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;
    const blink = _blinkPhase;
    const glow = 6 + blink * 6;

    ctx.save();
    ctx.shadowBlur = glow;
    ctx.shadowColor = '#ffee00';

    // Key ring
    ctx.strokeStyle = `rgba(255,238,0,${0.8 + blink * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx - 6, cy, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Key shaft
    ctx.beginPath();
    ctx.moveTo(cx - 1, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.stroke();

    // Key teeth
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy);
    ctx.lineTo(cx + 7, cy + 5);
    ctx.moveTo(cx + 10, cy);
    ctx.lineTo(cx + 10, cy + 4);
    ctx.stroke();

    ctx.restore();
  }

  function _drawExit(ctx, x, y) {
    const s = TILE_SIZE;
    const blink = _blinkPhase;
    const glow = 8 + blink * 8;
    ctx.save();
    ctx.shadowBlur = glow;
    ctx.shadowColor = '#00ffcc';

    // Pulsing border
    ctx.strokeStyle = `rgba(0,255,204,${0.6 + blink * 0.4})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, s - 8, s - 8);

    // Arrow pointing right
    const cx = x + s / 2;
    const cy = y + s / 2;
    ctx.fillStyle = `rgba(0,255,204,${0.5 + blink * 0.4})`;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx - 8, cy + 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function _drawAmmo(ctx, x, y) {
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;
    const blink = _blinkPhase;
    const glow = 6 + blink * 8;

    ctx.save();
    ctx.shadowBlur = glow;
    ctx.shadowColor = '#00ff88';

    // Bomb icon: outer circle
    ctx.strokeStyle = `rgba(0,255,136,${0.8 + blink * 0.2})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Fill
    ctx.fillStyle = `rgba(0,200,100,${0.25 + blink * 0.15})`;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 9, 0, Math.PI * 2);
    ctx.fill();

    // Fuse / stem
    ctx.strokeStyle = `rgba(0,255,136,${0.7 + blink * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx, cy - 12);
    ctx.lineTo(cx + 5, cy - 16);
    ctx.stroke();

    // Spark dot at fuse tip
    ctx.fillStyle = `rgba(255,255,100,${0.6 + blink * 0.4})`;
    ctx.shadowColor = '#ffff44';
    ctx.shadowBlur = 5 + blink * 5;
    ctx.beginPath();
    ctx.arc(cx + 5, cy - 16, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  return {
    TILE, TILE_SIZE,
    init, get, set,
    isPassable, isDoor, isKey, isExit, isAmmo,
    openDoor, removeKey, removeAmmo,
    pixelWidth, pixelHeight, cols, rows,
    hasLineOfSight,
    update, draw
  };
})();
