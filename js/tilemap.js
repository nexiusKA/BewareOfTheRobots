// ── tilemap.js ──────────────────────────────────────────────
// Tile types, grid storage, collision, and rendering.
// Rendering is theme-aware — call setTheme() before drawing.

const Tilemap = (() => {

  // ── Tile constants ──────────────────────────────────────
  const TILE = {
    FLOOR:       0,
    WALL:        1,
    DOOR:        2,   // locked door — yellow (default)
    DOOR_OPEN:   3,   // open door (passable, all colors share this)
    KEY:         4,   // collectible key — yellow (default)
    EXIT:        5,   // level exit
    AMMO:        6,   // bomb ammo pickup
    DEMOLITION:  7,   // demolition perk — bombs destroy walls
    // Colored keys
    KEY_RED:     8,
    KEY_BLUE:    9,
    KEY_GREEN:   10,
    // Colored doors (locked)
    DOOR_RED:    11,
    DOOR_BLUE:   12,
    DOOR_GREEN:  13,
    // ── Puzzle tiles ──────────────────────────────────────
    PRESSURE_PLATE:  14,   // floor-like; activates linked door when stood on
    TIMED_DOOR:      15,   // impassable when closed; opens for a limited time
    ONE_WAY_DOOR:    16,   // impassable until pressure-plate activated; opens permanently
    CONVEYOR_RIGHT:  17,   // floor-like; auto-moves player right
    CONVEYOR_LEFT:   18,   // floor-like; auto-moves player left
    CONVEYOR_UP:     19,   // floor-like; auto-moves player up
    CONVEYOR_DOWN:   20,   // floor-like; auto-moves player down
    TRAP:            21,   // floor-like; triggers alarm when first stepped on
    LASER_EMITTER_H: 22,   // wall-like; emits horizontal laser beam
    LASER_EMITTER_V: 23,   // wall-like; emits vertical laser beam
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

  // ── Color helpers ───────────────────────────────────────
  const _DOOR_COLOR_MAP = {
    [TILE.DOOR]:       'yellow',
    [TILE.DOOR_RED]:   'red',
    [TILE.DOOR_BLUE]:  'blue',
    [TILE.DOOR_GREEN]: 'green',
  };
  const _KEY_COLOR_MAP = {
    [TILE.KEY]:       'yellow',
    [TILE.KEY_RED]:   'red',
    [TILE.KEY_BLUE]:  'blue',
    [TILE.KEY_GREEN]: 'green',
  };

  const KEY_HEX_COLOR   = { yellow: '#ffee00', red: '#ff4455', blue: '#4488ff', green: '#44ff88' };
  const DOOR_FILL_COLOR = { yellow: '#cc5500', red: '#991122', blue: '#113399', green: '#116633' };
  const DOOR_GLOW_COLOR = { yellow: '#ff8800', red: '#ff4455', blue: '#4488ff', green: '#44ff88' };

  function isPassable(col, row) {
    const t = get(col, row);
    return t === TILE.FLOOR || t === TILE.DOOR_OPEN ||
           t === TILE.KEY || t === TILE.KEY_RED || t === TILE.KEY_BLUE || t === TILE.KEY_GREEN ||
           t === TILE.EXIT || t === TILE.AMMO || t === TILE.DEMOLITION ||
           t === TILE.PRESSURE_PLATE ||
           t === TILE.CONVEYOR_RIGHT || t === TILE.CONVEYOR_LEFT ||
           t === TILE.CONVEYOR_UP   || t === TILE.CONVEYOR_DOWN  ||
           t === TILE.TRAP;
  }

  // Returns the color string for a door tile, or null if not a door.
  function getDoorColor(col, row) {
    return _DOOR_COLOR_MAP[get(col, row)] || null;
  }

  // Returns the color string for a key tile, or null if not a key.
  function getKeyColor(col, row) {
    return _KEY_COLOR_MAP[get(col, row)] || null;
  }

  function isDoor(col, row) {
    return _DOOR_COLOR_MAP[get(col, row)] !== undefined;
  }

  function isKey(col, row) {
    return _KEY_COLOR_MAP[get(col, row)] !== undefined;
  }

  function isExit(col, row)           { return get(col, row) === TILE.EXIT; }
  function isAmmo(col, row)           { return get(col, row) === TILE.AMMO; }
  function isDemolitionPerk(col, row) { return get(col, row) === TILE.DEMOLITION; }
  function isPressurePlate(col, row)  { return get(col, row) === TILE.PRESSURE_PLATE; }
  function isTrap(col, row)           { return get(col, row) === TILE.TRAP; }

  // Returns conveyor direction {dx,dy} if the tile is a conveyor, else null.
  function getConveyorDir(col, row) {
    const t = get(col, row);
    if (t === TILE.CONVEYOR_RIGHT) return { dx:  1, dy:  0 };
    if (t === TILE.CONVEYOR_LEFT)  return { dx: -1, dy:  0 };
    if (t === TILE.CONVEYOR_UP)    return { dx:  0, dy: -1 };
    if (t === TILE.CONVEYOR_DOWN)  return { dx:  0, dy:  1 };
    return null;
  }

  // Opens a timed door (transition to DOOR_OPEN state).
  function openTimedDoor(col, row) {
    if (get(col, row) === TILE.TIMED_DOOR) set(col, row, TILE.DOOR_OPEN);
  }

  // Re-closes a timed door after its timer expires.
  function closeTimedDoor(col, row) {
    if (get(col, row) === TILE.DOOR_OPEN) set(col, row, TILE.TIMED_DOOR);
  }

  // Permanently opens a one-way door.
  function openOneWayDoor(col, row) {
    if (get(col, row) === TILE.ONE_WAY_DOOR) {
      set(col, row, TILE.DOOR_OPEN);
      startDoorOpenEffect(col, row);
    }
  }

  // Open any colored door (all share DOOR_OPEN state).
  function openDoor(col, row) {
    if (_DOOR_COLOR_MAP[get(col, row)] !== undefined) set(col, row, TILE.DOOR_OPEN);
  }
  // Alias used by player.js
  const openColoredDoor = openDoor;

  function removeKey(col, row) {
    if (_KEY_COLOR_MAP[get(col, row)] !== undefined) set(col, row, TILE.FLOOR);
  }
  // Alias used by player.js
  const removeColoredKey = removeKey;

  function removeAmmo(col, row) {
    if (get(col, row) === TILE.AMMO) set(col, row, TILE.FLOOR);
  }

  function removeDemolitionPerk(col, row) {
    if (get(col, row) === TILE.DEMOLITION) set(col, row, TILE.FLOOR);
  }

  // Destroy non-border WALL tiles directly adjacent (8 neighbours) to the
  // bomb's tile. Called when a bomb explodes with the demolition perk active.
  function destroyAdjacentWalls(px, py) {
    const bc = Math.floor(px / TILE_SIZE);
    const br = Math.floor(py / TILE_SIZE);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const c = bc + dc;
        const r = br + dr;
        if (c < 1 || c > _cols - 2 || r < 1 || r > _rows - 2) continue;
        if (get(c, r) === TILE.WALL) set(c, r, TILE.FLOOR);
      }
    }
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
      if (tile === TILE.WALL || _DOOR_COLOR_MAP[tile] !== undefined) return false;
    }
    return true;
  }

  // ── Animation ───────────────────────────────────────────
  let _blinkTimer = 0;
  let _blinkPhase = 0;
  let _fastBlinkPhase = 0; // faster oscillation for collectibles

  // Door-open flash effects: key = "col,row", value = 0-1 (1=just opened, fades to 0)
  let _doorOpenEffects = {};

  function startDoorOpenEffect(col, row) {
    _doorOpenEffects[`${col},${row}`] = 1.0;
  }

  // Per-theme animated accents: an array of { x, y, type } built once
  // per init and reused across frames to avoid GC pressure.
  let _wallAccents = [];

  function update(dt) {
    _blinkTimer += dt;
    _blinkPhase     = (Math.sin(_blinkTimer * 3) + 1) / 2; // 0-1 at ~3 Hz
    _fastBlinkPhase = (Math.sin(_blinkTimer * 6) + 1) / 2; // 0-1 at ~6 Hz

    // Decay door-open flash effects (0.55 second fade)
    for (const key in _doorOpenEffects) {
      _doorOpenEffects[key] -= dt / 0.55;
      if (_doorOpenEffects[key] <= 0) delete _doorOpenEffects[key];
    }
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
        } else if (_DOOR_COLOR_MAP[tile] !== undefined) {
          _drawDoor(ctx, x, y, _DOOR_COLOR_MAP[tile]);
        } else if (_KEY_COLOR_MAP[tile] !== undefined) {
          const kc = KEY_HEX_COLOR[_KEY_COLOR_MAP[tile]];
          ctx.fillStyle = `rgba(${_hexToRgb(kc)},${0.04 + _fastBlinkPhase * 0.08})`;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          _drawKey(ctx, x, y, _KEY_COLOR_MAP[tile]);
        } else if (tile === TILE.EXIT) {
          ctx.fillStyle = `rgba(0,255,204,${0.04 + _fastBlinkPhase * 0.08})`;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          _drawExit(ctx, x, y);
        } else if (tile === TILE.AMMO) {
          ctx.fillStyle = `rgba(0,255,136,${0.03 + _fastBlinkPhase * 0.07})`;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          _drawAmmo(ctx, x, y);
        } else if (tile === TILE.DEMOLITION) {
          ctx.fillStyle = `rgba(255,100,0,${0.03 + _fastBlinkPhase * 0.07})`;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          _drawDemolition(ctx, x, y);
        } else if (tile === TILE.PRESSURE_PLATE) {
          _drawPressurePlate(ctx, x, y, col, row);
        } else if (tile === TILE.TIMED_DOOR) {
          _drawTimedDoor(ctx, x, y);
        } else if (tile === TILE.ONE_WAY_DOOR) {
          _drawOneWayDoor(ctx, x, y);
        } else if (tile === TILE.CONVEYOR_RIGHT) {
          _drawConveyor(ctx, x, y, 0);
        } else if (tile === TILE.CONVEYOR_LEFT) {
          _drawConveyor(ctx, x, y, Math.PI);
        } else if (tile === TILE.CONVEYOR_UP) {
          _drawConveyor(ctx, x, y, -Math.PI / 2);
        } else if (tile === TILE.CONVEYOR_DOWN) {
          _drawConveyor(ctx, x, y, Math.PI / 2);
        } else if (tile === TILE.TRAP) {
          _drawTrap(ctx, x, y);
        } else if (tile === TILE.LASER_EMITTER_H) {
          _drawWall(ctx, x, y);
          _drawLaserEmitter(ctx, x, y, 'H');
        } else if (tile === TILE.LASER_EMITTER_V) {
          _drawWall(ctx, x, y);
          _drawLaserEmitter(ctx, x, y, 'V');
        }

        // Subtle grid lines on passable tiles
        if (tile !== TILE.WALL && tile !== TILE.LASER_EMITTER_H && tile !== TILE.LASER_EMITTER_V) {
          ctx.strokeStyle = fg;
          ctx.lineWidth   = 0.5;
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        }

        // Door-open flash overlay (shiny unlock effect)
        const dk = `${col},${row}`;
        if (_doorOpenEffects[dk] !== undefined) {
          const progress = _doorOpenEffects[dk]; // 1→0
          ctx.save();
          // White inner flash
          ctx.globalAlpha = progress * 0.75;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          // Golden radial shimmer
          ctx.globalAlpha = progress * 0.65;
          const grad = ctx.createRadialGradient(
            x + TILE_SIZE / 2, y + TILE_SIZE / 2, 1,
            x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.7
          );
          grad.addColorStop(0,   'rgba(255,240,120,1)');
          grad.addColorStop(0.5, 'rgba(255,180, 40,0.5)');
          grad.addColorStop(1,   'rgba(255,120,  0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.restore();
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
  function _drawDoor(ctx, x, y, color) {
    const s     = TILE_SIZE;
    const blink = _blinkPhase;
    const col   = color || 'yellow';
    const fill  = DOOR_FILL_COLOR[col] || '#cc5500';
    const glow  = DOOR_GLOW_COLOR[col] || '#ff8800';

    ctx.fillStyle = fill;
    ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
    ctx.fillStyle = '#0d0d1f';
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(x + 6, y + (s / 4) * i - 1, s - 12, 2);
    }
    const glowAlpha = 0.6 + blink * 0.4;
    ctx.shadowBlur   = 10 * blink;
    ctx.shadowColor  = glow;
    ctx.strokeStyle  = `rgba(${_hexToRgb(glow)},${glowAlpha})`;
    ctx.lineWidth    = 2;
    ctx.strokeRect(x + 4, y + 4, s - 8, s - 8);
    ctx.shadowBlur   = 0;

    // Color indicator dot
    ctx.fillStyle = glow;
    ctx.shadowBlur  = 6 + blink * 8;
    ctx.shadowColor = glow;
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2 - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Key ──────────────────────────────────────────────────
  function _drawKey(ctx, x, y, color) {
    const cx    = x + TILE_SIZE / 2;
    const cy    = y + TILE_SIZE / 2;
    const blink = _fastBlinkPhase;
    const glow  = 8 + blink * 12;
    const col   = color || 'yellow';
    const kc    = KEY_HEX_COLOR[col] || '#ffee00';

    ctx.save();
    ctx.shadowBlur  = glow;
    ctx.shadowColor = kc;

    ctx.strokeStyle = `rgba(${_hexToRgb(kc)},${0.8 + blink * 0.2})`;
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

  // ── Hex color to "r,g,b" string for rgba() use ──────────
  function _hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  }

  // ── Exit ─────────────────────────────────────────────────
  function _drawExit(ctx, x, y) {
    const s     = TILE_SIZE;
    const blink = _fastBlinkPhase;
    const glow  = 10 + blink * 12;
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

  // ── Demolition perk ──────────────────────────────────────
  function _drawDemolition(ctx, x, y) {
    const cx    = x + TILE_SIZE / 2;
    const cy    = y + TILE_SIZE / 2;
    const blink = _blinkPhase;
    const glow  = 8 + blink * 10;

    ctx.save();
    ctx.shadowBlur  = glow;
    ctx.shadowColor = '#ff6600';

    // Outer pulsing ring
    ctx.strokeStyle = `rgba(255,${100 + (blink * 80) | 0},0,${0.7 + blink * 0.3})`;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Inner fill
    ctx.fillStyle = `rgba(255,60,0,${0.18 + blink * 0.12})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    // Bomb body
    ctx.shadowBlur  = 5 + blink * 5;
    ctx.shadowColor = '#ff8800';
    ctx.fillStyle   = `rgba(255,${80 + (blink * 60) | 0},0,${0.85 + blink * 0.15})`;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Highlight on bomb
    ctx.fillStyle = `rgba(255,255,255,${0.3 + blink * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx - 1.5, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Fuse spark
    ctx.strokeStyle = `rgba(255,255,100,${0.6 + blink * 0.4})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx,     cy - 4);
    ctx.lineTo(cx + 3, cy - 8);
    ctx.stroke();

    // Small wall-crack lines (cross) to indicate wall-breaking
    ctx.strokeStyle = `rgba(255,180,80,${0.55 + blink * 0.25})`;
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 3); ctx.lineTo(cx - 7, cy - 7);
    ctx.moveTo(cx - 7,  cy - 3); ctx.lineTo(cx - 11, cy - 7);
    ctx.stroke();

    ctx.shadowBlur = 0;
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

  // ── Pressure plate ───────────────────────────────────────
  function _drawPressurePlate(ctx, x, y, col, row) {
    const cx    = x + TILE_SIZE / 2;
    const cy    = y + TILE_SIZE / 2;
    const blink = _fastBlinkPhase;
    const isLit = (typeof PuzzleManager !== 'undefined') && PuzzleManager.isPlateLit(col, row);
    const glow  = isLit ? (14 + blink * 10) : (4 + blink * 4);
    const color = isLit ? '#00ffcc' : '#00aa88';

    ctx.save();
    ctx.shadowBlur  = glow;
    ctx.shadowColor = color;

    // Recessed plate outline
    ctx.strokeStyle = `rgba(0,${isLit ? 255 : 180},${isLit ? 204 : 140},${0.7 + blink * 0.3})`;
    ctx.lineWidth   = 2;
    ctx.strokeRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);

    // Inner fill
    ctx.fillStyle = `rgba(0,${isLit ? 200 : 120},${isLit ? 160 : 100},${isLit ? 0.3 + blink * 0.2 : 0.12})`;
    ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);

    // Centre diamond indicator
    ctx.fillStyle = `rgba(0,${isLit ? 255 : 160},${isLit ? 220 : 120},${0.8 + blink * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(cx,      cy - 7);
    ctx.lineTo(cx + 7,  cy);
    ctx.lineTo(cx,      cy + 7);
    ctx.lineTo(cx - 7,  cy);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Timed door ───────────────────────────────────────────
  function _drawTimedDoor(ctx, x, y) {
    const s     = TILE_SIZE;
    const blink = _blinkPhase;

    ctx.fillStyle = '#330055';
    ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
    // Horizontal planks
    ctx.fillStyle = '#0d0d1f';
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(x + 6, y + (s / 4) * i - 1, s - 12, 2);
    }
    // Purple glow border
    const glowA = 0.6 + blink * 0.4;
    ctx.shadowBlur  = 10 * blink;
    ctx.shadowColor = '#cc44ff';
    ctx.strokeStyle = `rgba(180,80,255,${glowA})`;
    ctx.lineWidth   = 2;
    ctx.strokeRect(x + 4, y + 4, s - 8, s - 8);
    ctx.shadowBlur  = 0;

    // Clock icon
    const cx = x + s / 2, cy = y + s / 2 - 6;
    ctx.strokeStyle = `rgba(200,100,255,${0.8 + blink * 0.2})`;
    ctx.lineWidth   = 1.5;
    ctx.shadowBlur  = 5 + blink * 6;
    ctx.shadowColor = '#cc44ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 3, cy + 1);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── One-way door ─────────────────────────────────────────
  function _drawOneWayDoor(ctx, x, y) {
    const s     = TILE_SIZE;
    const blink = _blinkPhase;

    ctx.fillStyle = '#003344';
    ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
    ctx.fillStyle = '#0d0d1f';
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(x + 6, y + (s / 4) * i - 1, s - 12, 2);
    }
    const glowA = 0.55 + blink * 0.35;
    ctx.shadowBlur  = 8 * blink;
    ctx.shadowColor = '#00ccff';
    ctx.strokeStyle = `rgba(0,180,255,${glowA})`;
    ctx.lineWidth   = 2;
    ctx.strokeRect(x + 4, y + 4, s - 8, s - 8);
    ctx.shadowBlur  = 0;

    // Single-arrow "one way" symbol
    const cx = x + s / 2, cy = y + s / 2 - 4;
    ctx.fillStyle = `rgba(0,210,255,${0.8 + blink * 0.2})`;
    ctx.shadowBlur  = 5 + blink * 6;
    ctx.shadowColor = '#00ccff';
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx - 2, cy - 6);
    ctx.lineTo(cx - 2, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(0,180,255,${0.7})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx - 2, cy);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Conveyor tile ─────────────────────────────────────────
  // angle: 0=right, π=left, -π/2=up, π/2=down
  function _drawConveyor(ctx, x, y, angle) {
    const cx    = x + TILE_SIZE / 2;
    const cy    = y + TILE_SIZE / 2;
    const blink = _blinkPhase;
    const bt    = _blinkTimer;
    // Animated scroll: use blinkTimer to shift stripe position
    const scroll = ((bt * 60) | 0) % TILE_SIZE;

    ctx.save();

    // Subtle directional tint on floor
    ctx.fillStyle = `rgba(0,160,255,${0.06 + blink * 0.04})`;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Animated directional stripe
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.shadowBlur  = 5 + blink * 5;
    ctx.shadowColor = '#0088ff';

    // Moving dashes along the conveyor direction
    for (let i = -2; i <= 2; i++) {
      const offset = ((i * 16 + scroll) % 48) - 24;
      const alpha  = 0.3 + blink * 0.25;
      ctx.fillStyle = `rgba(0,160,255,${alpha})`;
      ctx.fillRect(offset - 4, -3, 8, 6);
    }

    // Arrow head
    ctx.fillStyle = `rgba(0,200,255,${0.65 + blink * 0.25})`;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(5,  7);
    ctx.lineTo(5, -7);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Trap tile ─────────────────────────────────────────────
  function _drawTrap(ctx, x, y) {
    const cx    = x + TILE_SIZE / 2;
    const cy    = y + TILE_SIZE / 2;
    const blink = _fastBlinkPhase;

    ctx.save();
    // Danger floor tint
    ctx.fillStyle = `rgba(255,30,30,${0.07 + blink * 0.07})`;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.shadowBlur  = 8 + blink * 8;
    ctx.shadowColor = '#ff2222';

    // Warning X
    ctx.strokeStyle = `rgba(255,50,50,${0.7 + blink * 0.3})`;
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 9); ctx.lineTo(cx + 9, cy + 9);
    ctx.moveTo(cx + 9, cy - 9); ctx.lineTo(cx - 9, cy + 9);
    ctx.stroke();

    // Outer warning circle
    ctx.strokeStyle = `rgba(255,80,80,${0.45 + blink * 0.35})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.lineCap    = 'butt';
    ctx.restore();
  }

  // ── Laser emitter ────────────────────────────────────────
  function _drawLaserEmitter(ctx, x, y, dir) {
    const s     = TILE_SIZE;
    const cx    = x + s / 2;
    const cy    = y + s / 2;
    const blink = _blinkPhase;

    ctx.save();
    ctx.shadowBlur  = 10 + blink * 12;
    ctx.shadowColor = '#ff3300';

    // Emitter housing (rectangular lens)
    ctx.fillStyle = `rgba(200,40,0,${0.85 + blink * 0.15})`;
    if (dir === 'H') {
      ctx.fillRect(x + 2, cy - 7, s - 4, 14);
    } else {
      ctx.fillRect(cx - 7, y + 2, 14, s - 4);
    }

    // Bright core lens
    ctx.fillStyle = `rgba(255,${100 + (blink * 80) | 0},0,${0.9 + blink * 0.1})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Beam exit glow (nozzle flash)
    ctx.fillStyle = `rgba(255,200,180,${0.5 + blink * 0.4})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  return {
    TILE, TILE_SIZE, KEY_HEX_COLOR, DOOR_GLOW_COLOR,
    init, get, set,
    setTheme, getTheme,
    isPassable, isDoor, isKey, isExit, isAmmo, isDemolitionPerk,
    isPressurePlate, isTrap, getConveyorDir,
    getDoorColor, getKeyColor,
    openDoor, openColoredDoor, removeKey, removeColoredKey, removeAmmo, removeDemolitionPerk,
    openTimedDoor, closeTimedDoor, openOneWayDoor,
    destroyAdjacentWalls,
    startDoorOpenEffect,
    pixelWidth, pixelHeight, cols, rows,
    hasLineOfSight,
    update, draw
  };
})();
