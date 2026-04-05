// ── puzzle.js ───────────────────────────────────────────────
// PuzzleManager: pressure plates, timed doors, one-way doors,
// laser emitters / beams, and trap tiles.
//
// Depends on Tilemap (loaded before this file).

const PuzzleManager = (() => {

  const TS = Tilemap.TILE_SIZE;

  // Timed door stays open for this many seconds after plate activation.
  const TIMED_DOOR_DURATION = 5.5;

  // Seconds a laser emitter stays disabled after a bomb hit.
  const LASER_DISABLE_DURATION = 6.0;

  // ── State ────────────────────────────────────────────────
  // Link record:
  //   plate:       {col, row}
  //   door:        {col, row}
  //   type:        'timed' | 'oneway'
  //   plateActive: bool  (ever pressed for oneway)
  //   doorState:   'closed' | 'open'
  //   timer:       seconds remaining (timed only)
  let _links = [];

  // Laser record:
  //   col, row:        emitter grid position
  //   dir:             'H' | 'V'
  //   disabled:        bool
  //   disableTimer:    seconds until re-enable
  //   beamCells:       [{col,row}, ...]
  let _lasers = [];

  // Untriggered trap positions: Set of "col,row" strings
  let _unTriggeredTraps = null;

  // Set true for one update frame when a trap is triggered
  let _trapTriggered = false;

  let _cols = 0;
  let _rows = 0;
  let _blinkTimer = 0;

  // ── Init ─────────────────────────────────────────────────

  // Called once per level load.
  // puzzleLinks: [{plate:{col,row}, door:{col,row}, type:'timed'|'oneway'}]
  function init(cols, rows, puzzleLinks) {
    _cols = cols;
    _rows = rows;
    _blinkTimer   = 0;
    _trapTriggered = false;

    // Build link records.
    _links = (puzzleLinks || []).map(lk => ({
      plate:       lk.plate,
      door:        lk.door,
      type:        lk.type || 'timed',
      plateActive: false,
      doorState:   'closed',
      timer:       0,
    }));

    // Scan tilemap for laser emitters and compute their initial beams.
    _lasers = [];
    const T = Tilemap.TILE;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = Tilemap.get(c, r);
        if (t === T.LASER_EMITTER_H || t === T.LASER_EMITTER_V) {
          const dir = (t === T.LASER_EMITTER_H) ? 'H' : 'V';
          _lasers.push({
            col: c, row: r, dir,
            disabled: false, disableTimer: 0,
            beamCells: _computeBeam(c, r, dir),
          });
        }
      }
    }

    // Collect all trap tile positions.
    _unTriggeredTraps = new Set();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Tilemap.get(c, r) === T.TRAP) {
          _unTriggeredTraps.add(`${c},${r}`);
        }
      }
    }
  }

  // Compute beam cells emitted from (ec, er) in direction dir.
  // The beam travels both ways along the axis from the emitter until it
  // hits a wall, door, or another emitter.
  function _computeBeam(ec, er, dir) {
    const cells = [];
    const T = Tilemap.TILE;

    function trace(dc, dr) {
      let c = ec + dc, r = er + dr;
      while (c >= 0 && c < _cols && r >= 0 && r < _rows) {
        const t = Tilemap.get(c, r);
        if (t === T.WALL || t === T.LASER_EMITTER_H || t === T.LASER_EMITTER_V) break;
        if (Tilemap.isDoor(c, r)) break;
        cells.push({ col: c, row: r });
        c += dc;
        r += dr;
      }
    }

    if (dir === 'H') { trace(-1, 0); trace(1, 0); }
    else             { trace(0, -1); trace(0, 1); }
    return cells;
  }

  // ── Public helpers ───────────────────────────────────────

  // Returns true if an active (non-disabled) laser beam occupies (col, row).
  function isLaserActiveAt(col, row) {
    for (const laser of _lasers) {
      if (laser.disabled) continue;
      for (const cell of laser.beamCells) {
        if (cell.col === col && cell.row === row) return true;
      }
    }
    return false;
  }

  // Returns true once per trap trigger; caller must consume promptly.
  function consumeTrapTrigger() {
    const v = _trapTriggered;
    _trapTriggered = false;
    return v;
  }

  // Returns true if the pressure plate at (col, row) is "lit" (active).
  function isPlateLit(col, row) {
    for (const link of _links) {
      if (link.plate.col === col && link.plate.row === row) {
        return link.plateActive || link.doorState === 'open';
      }
    }
    return false;
  }

  // Returns the fraction of open time remaining for a timed door (0-1), or null.
  function getTimedDoorFraction(col, row) {
    for (const link of _links) {
      if (link.type === 'timed' && link.door.col === col && link.door.row === row) {
        return link.doorState === 'open' ? link.timer / TIMED_DOOR_DURATION : null;
      }
    }
    return null;
  }

  // ── Update ───────────────────────────────────────────────

  function update(dt, playerCol, playerRow) {
    _blinkTimer    += dt;
    _trapTriggered  = false;

    // ── Pressure plates / doors ──────────────────────────────
    for (const link of _links) {
      const onPlate = (playerCol === link.plate.col && playerRow === link.plate.row);

      if (link.type === 'timed') {
        // Stepping on plate (re-)opens the door and resets the countdown.
        if (onPlate) {
          if (link.doorState !== 'open') {
            link.doorState = 'open';
            Tilemap.openTimedDoor(link.door.col, link.door.row);
          }
          link.timer = TIMED_DOOR_DURATION; // refresh while standing on plate
        }
        // Count down; close when expired (but not if player is standing in the door).
        if (link.doorState === 'open') {
          link.timer -= dt;
          if (link.timer <= 0 &&
              !(playerCol === link.door.col && playerRow === link.door.row)) {
            link.doorState = 'closed';
            Tilemap.closeTimedDoor(link.door.col, link.door.row);
          }
        }
      } else { // 'oneway'
        if (onPlate && !link.plateActive) {
          link.plateActive = true;
          link.doorState   = 'open';
          Tilemap.openOneWayDoor(link.door.col, link.door.row);
        }
      }
    }

    // ── Laser disable timers ─────────────────────────────────
    for (const laser of _lasers) {
      if (laser.disabled) {
        laser.disableTimer -= dt;
        if (laser.disableTimer <= 0) {
          laser.disabled = false;
          // Recompute beam in case map changed while laser was off.
          laser.beamCells = _computeBeam(laser.col, laser.row, laser.dir);
        }
      }
    }

    // ── Trap detection ───────────────────────────────────────
    const trapKey = `${playerCol},${playerRow}`;
    if (_unTriggeredTraps && _unTriggeredTraps.has(trapKey)) {
      _unTriggeredTraps.delete(trapKey);
      _trapTriggered = true;
    }
  }

  // ── Bomb blast ───────────────────────────────────────────

  // Called when a bomb detonates.  Disables any laser emitter within radius px.
  function onBombBlast(bpx, bpy, radius) {
    const bc = bpx / TS;
    const br = bpy / TS;
    for (const laser of _lasers) {
      const dx   = (laser.col + 0.5) - bc;
      const dy   = (laser.row + 0.5) - br;
      const dist = Math.sqrt(dx * dx + dy * dy) * TS;
      if (dist <= radius) {
        laser.disabled    = true;
        laser.disableTimer = LASER_DISABLE_DURATION;
      }
    }
  }

  // ── Draw ─────────────────────────────────────────────────

  // Draw laser beams and timed-door countdown arcs.
  // Must be called inside the world-space transform (same as Tilemap.draw).
  function draw(ctx) {
    const blink = (Math.sin(_blinkTimer * 6) + 1) / 2;

    // ── Laser beams ──────────────────────────────────────────
    ctx.save();
    for (const laser of _lasers) {
      const alpha = laser.disabled
        ? Math.max(0, (Math.sin(_blinkTimer * 14) + 1) / 2 * 0.3)
        : (0.55 + blink * 0.25);
      const shadowColor = laser.disabled ? '#884400' : '#ff2200';
      const baseColor   = laser.disabled ? `rgba(200,80,0,${alpha})`      : `rgba(255,30,30,${alpha})`;
      const coreColor   = laser.disabled ? `rgba(255,120,0,${alpha * 0.6})` : `rgba(255,190,190,${0.7 + blink * 0.3})`;

      for (const cell of laser.beamCells) {
        const x = cell.col * TS;
        const y = cell.row * TS;
        ctx.shadowBlur  = laser.disabled ? 4 : 14;
        ctx.shadowColor = shadowColor;
        if (laser.dir === 'H') {
          ctx.fillStyle = baseColor;
          ctx.fillRect(x, y + TS / 2 - 3, TS, 6);
          if (!laser.disabled) {
            ctx.fillStyle = coreColor;
            ctx.fillRect(x, y + TS / 2 - 1, TS, 2);
          }
        } else {
          ctx.fillStyle = baseColor;
          ctx.fillRect(x + TS / 2 - 3, y, 6, TS);
          if (!laser.disabled) {
            ctx.fillStyle = coreColor;
            ctx.fillRect(x + TS / 2 - 1, y, 2, TS);
          }
        }
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();

    // ── Timed door countdown arcs ────────────────────────────
    ctx.save();
    for (const link of _links) {
      if (link.type !== 'timed' || link.doorState !== 'open') continue;
      const frac = link.timer / TIMED_DOOR_DURATION; // 1 → 0
      const cx   = link.door.col * TS + TS / 2;
      const cy   = link.door.row * TS + TS / 2;
      const urgency = frac < 0.3 ? (1 - frac / 0.3) * 0.5 : 0; // extra pulse when nearly closed
      ctx.strokeStyle = `rgba(${180 + (urgency * 75) | 0},80,255,${0.7 + blink * 0.3})`;
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 8 + urgency * 10;
      ctx.shadowColor = '#8833ff';
      ctx.beginPath();
      ctx.arc(cx, cy, TS * 0.36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // ── Public API ───────────────────────────────────────────
  return {
    init, update, draw,
    isLaserActiveAt, consumeTrapTrigger, onBombBlast,
    getTimedDoorFraction, isPlateLit,
  };

})();
