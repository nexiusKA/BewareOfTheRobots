// ── mapgen.js ─────────────────────────────────────────────────
// Procedural maze generator.
//
// Algorithm: recursive backtracker (depth-first search) on a cell
// grid with stride 2, run independently in each horizontal zone.
// Zones are separated by full-wall "barrier rows" that each contain
// exactly one DOOR tile, giving the same key-and-door puzzle structure
// as the hand-crafted levels.
//
// After the maze is carved, a set of horizontal "highway" corridors
// are opened so enemies have straight patrol paths (the same style
// used in all existing levels).

const MapGen = (() => {

  // Tile shorthands
  const W = 1; // WALL
  const F = 0; // FLOOR
  const D = 2; // DOOR (locked)
  const E = 5; // EXIT
  const A = 6; // AMMO pickup
  const K = 4; // KEY (placeholder — redistributed by game.js)
  const P = 7; // DEMOLITION perk pickup

  // ── Public API ───────────────────────────────────────────

  // generate(config) → { cols, rows, map, playerStart, enemies, keyCount, minKeyDist }
  // config: { cols, rows, doorCount, ammoCount, keyCount,
  //           enemyCount, scannerCount,
  //           extraPassageRate, enemySpeedMult, visionMult, minKeyDist }
  function generate(config) {
    const { cols, rows, doorCount, ammoCount, keyCount,
            enemyCount, scannerCount } = config;
    // Difficulty tuning fields — all have sensible defaults so old configs work.
    const extraPassageRate = config.extraPassageRate ?? 0.12;
    const enemySpeedMult   = config.enemySpeedMult   ?? 1.00;
    const visionMult       = config.visionMult       ?? 1.00;
    const minKeyDist       = config.minKeyDist       ?? 6;

    // ── 1. All walls ────────────────────────────────────────
    const grid = new Array(cols * rows).fill(W);

    // ── 2. Exit corridor at row 1 ───────────────────────────
    for (let c = 1; c < cols - 1; c++) grid[1 * cols + c] = F;
    grid[1 * cols + (cols - 2)] = E;

    // ── 3. Door barrier rows ────────────────────────────────
    // Spread doorCount barriers across the top 35% of the map,
    // keeping at least 3 rows between each barrier.
    const topBand   = Math.max(3, Math.floor(rows * 0.35));
    const doorRows  = [];
    const doorCols  = [];
    for (let d = 0; d < doorCount; d++) {
      let dr = 2 + Math.round(d * (topBand - 2) / Math.max(doorCount, 1));
      // clamp & deduplicate
      dr = Math.max(2, Math.min(dr, rows - 3));
      while (doorRows.includes(dr)) dr++;
      doorRows.push(dr);
      // Odd column for door so it aligns cleanly with maze cells
      const dc = _pickOdd(3, cols - 4);
      doorCols.push(dc);
      grid[dr * cols + dc] = D;
    }

    // ── 4. Carve maze zones ─────────────────────────────────
    // Zone boundaries: between exit row and first door, between
    // consecutive doors, and from last door to the bottom border.
    const zoneRanges = _buildZoneRanges(doorRows, rows);
    for (const [r1, r2] of zoneRanges) {
      _carveMazeZone(grid, cols, r1, r2, extraPassageRate);
    }

    // ── 5. Guarantee door connectivity ─────────────────────
    // Force floor on both sides of every door so the player can
    // always pass through once they have the key.
    for (let i = 0; i < doorRows.length; i++) {
      const dr = doorRows[i];
      const dc = doorCols[i];
      if (dr > 1)      grid[(dr - 1) * cols + dc] = F;
      if (dr < rows-1) grid[(dr + 1) * cols + dc] = F;
    }

    // ── 6. Highway corridors for enemy patrol ───────────────
    // Open full horizontal rows so enemies have straight paths.
    // One corridor in the exit zone and several in the main zone.
    const lastDoor   = doorRows.length > 0 ? doorRows[doorRows.length - 1] : 1;
    const mainStart  = lastDoor + 1;
    const mainEnd    = rows - 2;

    const corridorRows = _buildHighwayCorridors(
      grid, cols, rows,
      doorRows,
      enemyCount + scannerCount,
      mainStart, mainEnd
    );

    // ── 7. Ammo pickups ─────────────────────────────────────
    // Place ammo near enemy corridor rows (danger zones) so the player
    // must take a risk to collect it.  Falls back to general placement if
    // there are not enough corridor-adjacent candidates.
    const playerRow = rows - 2;
    const playerCol = 1;
    _placeAmmoNearCorridors(grid, cols, ammoCount, corridorRows,
                            mainStart, mainEnd, playerCol, playerRow);

    // ── 7b. Demolition perk (one per level) ─────────────────
    _placePickups(grid, cols, 1, P, mainStart, mainEnd, playerCol, playerRow, 6);

    // ── 8. Key placeholders ─────────────────────────────────
    // Place K tiles in the main zone so _randomizeKeyPositions
    // (game.js) can count and redistribute them.
    _placePickups(grid, cols, keyCount, K, mainStart, mainEnd, playerCol, playerRow, 4);

    // ── 9. Player start ─────────────────────────────────────
    grid[playerRow * cols + playerCol] = F;

    // ── 10. Generate enemy definitions ──────────────────────
    const enemies = _buildEnemies(
      cols, enemyCount, scannerCount,
      corridorRows, doorRows,
      enemySpeedMult, visionMult
    );

    return {
      cols, rows,
      map: grid,
      playerStart: { col: playerCol, row: playerRow },
      enemies,
      keyCount,
      minKeyDist,
    };
  }

  // ── Zone helper ─────────────────────────────────────────

  function _buildZoneRanges(doorRows, totalRows) {
    const ranges = [];
    let prev = 1; // row 1 is the exit corridor, zones start at row 2
    for (const dr of doorRows) {
      if (dr - 1 >= prev + 1) ranges.push([prev + 1, dr - 1]);
      prev = dr;
    }
    // Main zone (below all doors)
    if (totalRows - 2 >= prev + 1) ranges.push([prev + 1, totalRows - 2]);
    return ranges;
  }

  // ── Maze carver ─────────────────────────────────────────

  // Carves a recursive-backtracker maze inside grid columns [1..cols-2]
  // and rows [r1..r2].  Cells live at odd positions within the range.
  // passageRate controls how many extra walls are removed (0 = pure maze,
  // higher values create more loops and open spaces).
  function _carveMazeZone(grid, cols, r1, r2, passageRate = 0.12) {
    if (r1 > r2) return;

    // If the zone is a single row, just open it entirely.
    if (r1 === r2) {
      for (let c = 1; c < cols - 1; c++) grid[r1 * cols + c] = F;
      return;
    }

    const cellCols = Math.floor((cols - 1) / 2);  // cells at cols 1,3,5,...

    // First odd row at or after r1
    const startRow = (r1 % 2 === 0) ? r1 + 1 : r1;
    // Last odd row at or before r2
    const endRow   = (r2 % 2 === 0) ? r2 - 1 : r2;

    // Zone too small for cell-based carving — open it entirely
    if (startRow > endRow) {
      for (let r = r1; r <= r2; r++)
        for (let c = 1; c < cols - 1; c++) grid[r * cols + c] = F;
      return;
    }

    const cellRows = Math.floor((endRow - startRow) / 2) + 1;
    const visited  = new Uint8Array(cellCols * cellRows);

    function dfs(ci, cri) {
      visited[cri * cellCols + ci] = 1;
      const gc = 1 + 2 * ci;
      const gr = startRow + 2 * cri;
      grid[gr * cols + gc] = F;

      // Shuffle directions (Fisher-Yates)
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (let i = 3; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = dirs[i]; dirs[i] = dirs[j]; dirs[j] = tmp;
      }

      for (const [di, dj] of dirs) {
        const ni = ci + di, nj = cri + dj;
        if (ni < 0 || ni >= cellCols || nj < 0 || nj >= cellRows) continue;
        if (visited[nj * cellCols + ni]) continue;
        // Carve the wall between the two cells
        grid[(gr + dj) * cols + (gc + di)] = F;
        dfs(ni, nj);
      }
    }

    // Start DFS from the bottom-left cell of this zone
    dfs(0, cellRows - 1);

    // Extra random passages to break up dead ends and give the maze a less
    // "spidery" feel.  The rate is set per-level via config.extraPassageRate.
    for (let r = startRow; r <= endRow; r += 2) {
      for (let ci = 0; ci < cellCols - 1; ci++) {
        if (Math.random() < passageRate) {
          const gc = 1 + 2 * ci;
          grid[r * cols + gc + 1] = F; // remove wall between adjacent cells
        }
      }
    }
    for (let cri = 0; cri < cellRows - 1; cri++) {
      for (let ci = 0; ci < cellCols; ci++) {
        if (Math.random() < passageRate) {
          const gc = 1 + 2 * ci;
          const gr = startRow + 2 * cri;
          grid[(gr + 1) * cols + gc] = F;
        }
      }
    }
  }

  // ── Highway corridors ────────────────────────────────────

  // Opens full horizontal rows so enemies have straight patrol paths.
  // Returns the list of opened row numbers.
  function _buildHighwayCorridors(grid, cols, rows, doorRows, totalEnemies, mainStart, mainEnd) {
    const corridorRows = [];

    // ── One corridor per inter-door zone ────────────────────
    // Zones: [2..firstDoor-1], [door[0]+1..door[1]-1], …
    let prev = 1; // exit row
    for (const dr of doorRows) {
      const zStart = prev + 1, zEnd = dr - 1;
      if (zEnd > zStart + 1) { // zone has room for a corridor
        const cr = Math.floor((zStart + zEnd) / 2);
        if (!doorRows.includes(cr) && cr > 1 && cr < rows - 1) {
          _openRow(grid, cols, cr);
          corridorRows.push({ row: cr, zone: 'upper' });
        }
      }
      prev = dr;
    }

    // ── Corridors in the main player zone ───────────────────
    const mainSpan = mainEnd - mainStart;
    // Number of corridors = roughly half the total enemies (rounded up)
    const numMain = Math.max(2, Math.ceil(totalEnemies / 2));
    for (let i = 0; i < numMain; i++) {
      const frac  = (i + 0.5) / numMain;
      let cr = mainStart + Math.round(frac * mainSpan);
      // clamp to valid range
      if (cr <= mainStart) cr = mainStart + 1;
      if (cr >= mainEnd)   cr = mainEnd - 1;
      _openRow(grid, cols, cr);
      corridorRows.push({ row: cr, zone: 'main' });
    }

    return corridorRows;
  }

  function _openRow(grid, cols, r) {
    for (let c = 1; c < cols - 1; c++) grid[r * cols + c] = F;
  }

  // ── Enemy generation ─────────────────────────────────────

  function _buildEnemies(cols, enemyCount, scannerCount, corridorRows, doorRows,
                         enemySpeedMult = 1.0, visionMult = 1.0) {
    const enemies = [];
    const mainCorridors  = corridorRows.filter(c => c.zone === 'main');
    const upperCorridors = corridorRows.filter(c => c.zone === 'upper');

    // Assign patrol enemies to corridors.
    const allEnemySlots = [];
    for (let i = 0; i < enemyCount; i++) {
      allEnemySlots.push({ type: 'guard_bot', idx: i });
    }
    for (let i = 0; i < scannerCount; i++) {
      allEnemySlots.push({ type: 'scanner_bot', idx: i });
    }

    // Distribute enemy slots across corridors (main first, then upper).
    const corridorCycle = [...mainCorridors, ...upperCorridors];
    if (corridorCycle.length === 0) return enemies;

    allEnemySlots.forEach((slot, slotIdx) => {
      const corr  = corridorCycle[slotIdx % corridorCycle.length];
      const row   = corr.row;
      const isScannerBot = slot.type === 'scanner_bot';

      // ── Patrol style ────────────────────────────────────────
      // Every third guard_bot patrols only the middle portion of the
      // corridor (creating an intersection choke-point that the player
      // must time carefully).  Scanners always do full-width patrols so
      // their wide vision angle covers the whole corridor.
      let colA, colB;
      if (!isScannerBot && slotIdx % 3 === 2 && cols > 20) {
        // Intersection guard: patrol middle 40% of corridor
        const third = Math.floor(cols * 0.30);
        colA = third;
        colB = cols - 1 - third;
      } else {
        // Full-width patrol: alternate direction per slot
        const ltr = slotIdx % 2 === 0;
        colA = ltr ? 1        : cols - 2;
        colB = ltr ? cols - 2 : 1;
      }

      const baseSpeed = (1.60 + 0.08 * slotIdx) * enemySpeedMult;

      enemies.push({
        type:        slot.type,
        patrol:      [{ col: colA, row }, { col: colB, row }],
        speed:       baseSpeed + (isScannerBot ? -0.35 : 0),
        visionRange: (isScannerBot ? 260 + (slotIdx % 4) * 10
                                   : 185 + (slotIdx % 4) * 5) * visionMult,
        visionAngle: (isScannerBot ? Math.PI / 2 : Math.PI / 3) * visionMult,
      });
    });

    return enemies;
  }

  // ── Ammo near danger zones ───────────────────────────────

  // Places ammo crates preferentially on floor tiles that are within
  // PROXIMITY rows of a highway corridor (where enemies patrol).  This
  // rewards risk — the player must get close to enemy routes to resupply.
  // Falls back to general random placement if there are not enough
  // corridor-adjacent candidates.
  function _placeAmmoNearCorridors(grid, cols, count, corridorRows,
                                   r1, r2, playerCol, playerRow) {
    const PROXIMITY = 2; // tiles above/below a corridor row to consider "near"
    const MIN_DIST  = 5; // minimum Manhattan distance from player start

    const corridorRowNums = new Set(corridorRows.map(c => c.row));

    // Collect preferred candidates: floor tiles near a corridor row
    const preferred = [];
    const fallback  = [];
    for (let r = r1; r <= r2; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (grid[r * cols + c] !== F) continue;
        if (Math.abs(r - playerRow) + Math.abs(c - playerCol) < MIN_DIST) continue;
        let nearCorridor = false;
        for (let dr = -PROXIMITY; dr <= PROXIMITY; dr++) {
          if (corridorRowNums.has(r + dr)) { nearCorridor = true; break; }
        }
        if (nearCorridor) preferred.push(r * cols + c);
        else              fallback.push(r * cols + c);
      }
    }

    // Shuffle both pools
    _shuffle(preferred);
    _shuffle(fallback);

    const pool = [...preferred, ...fallback];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
      grid[pool[i]] = A;
    }
  }

  function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  // ── Pickup placement ─────────────────────────────────────

  // Places `count` tiles of type `tileType` in the floor area of the
  // main zone, spread away from the player start.
  function _placePickups(grid, cols, count, tileType, r1, r2, playerCol, playerRow, minDist) {
    const candidates = [];
    for (let r = r1; r <= r2; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (grid[r * cols + c] !== F) continue;
        if (Math.abs(r - playerRow) + Math.abs(c - playerCol) < minDist) continue;
        candidates.push(r * cols + c);
      }
    }
    _shuffle(candidates);
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      grid[candidates[i]] = tileType;
    }
  }

  // ── Utilities ────────────────────────────────────────────

  // Returns a random odd integer in [lo, hi] (both inclusive).
  function _pickOdd(lo, hi) {
    lo = lo % 2 === 0 ? lo + 1 : lo;
    hi = hi % 2 === 0 ? hi - 1 : hi;
    if (lo > hi) return lo;
    const count = Math.floor((hi - lo) / 2) + 1;
    return lo + 2 * ((Math.random() * count) | 0);
  }

  return { generate };
})();
