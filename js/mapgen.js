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
  const D = 2; // DOOR (locked — yellow)
  const E = 5; // EXIT
  const A = 6; // AMMO pickup
  const K = 4; // KEY — yellow
  const P = 7; // DEMOLITION perk pickup
  // Colored doors
  const D_R = 11; // DOOR_RED
  const D_B = 12; // DOOR_BLUE
  const D_G = 13; // DOOR_GREEN
  // Colored keys (placeholder tiles redistributed by game.js)
  const K_R = 8;  // KEY_RED
  const K_B = 9;  // KEY_BLUE
  const K_G = 10; // KEY_GREEN
  // Puzzle tiles
  const PP = 14; // PRESSURE_PLATE
  const TD = 15; // TIMED_DOOR
  const OW = 16; // ONE_WAY_DOOR
  const CR = 17; // CONVEYOR_RIGHT
  const CL = 18; // CONVEYOR_LEFT
  const CU = 19; // CONVEYOR_UP
  const CD = 20; // CONVEYOR_DOWN
  const TR = 21; // TRAP
  const LH = 22; // LASER_EMITTER_H
  const LV = 23; // LASER_EMITTER_V

  // Color sequences (index = player encounter order, 0 = first door hit)
  const _DOOR_COLOR_TILES = [D, D_R, D_B, D_G];
  const _KEY_COLOR_TILES  = [K, K_R, K_B, K_G];

  // ── Public API ───────────────────────────────────────────

  // generate(config) → { cols, rows, map, playerStart, enemies, keyCount, minKeyDist }
  // config: { cols, rows, doorCount, ammoCount, keyCount,
  //           enemyCount, scannerCount,
  //           extraPassageRate, enemySpeedMult, visionMult, minKeyDist }
  function generate(config) {
    const { cols, rows, doorCount, ammoCount, keyCount,
            enemyCount, scannerCount } = config;
    const snifferCount = config.snifferCount || 0;
    const fastCount    = config.fastCount    || 0;
    const heavyCount   = config.heavyCount   || 0;
    // Difficulty tuning fields — all have sensible defaults so old configs work.
    const extraPassageRate = config.extraPassageRate ?? 0.12;
    const enemySpeedMult   = config.enemySpeedMult   ?? 1.00;
    const visionMult       = config.visionMult       ?? 1.00;
    const minKeyDist       = config.minKeyDist       ?? 6;

    // ── 1. All walls ────────────────────────────────────────
    const grid = new Array(cols * rows).fill(W);

    // ── 2. Exit corridor at rows 1-2 ────────────────────────
    // Row 1 holds the exit tile.  Row 2 is pre-opened as an approach
    // corridor so the maze zone (carved from row 3 downward, since the
    // DFS cell carver only touches odd-numbered rows) always has a floor
    // path to the exit.  Without this, row 2 stays as solid wall and the
    // exit is permanently unreachable.
    for (let c = 1; c < cols - 1; c++) grid[1 * cols + c] = F;
    grid[1 * cols + (cols - 2)] = E;
    for (let c = 1; c < cols - 1; c++) grid[2 * cols + c] = F;

    // ── 3. Door barrier rows ────────────────────────────────
    // Spread doorCount barriers evenly across most of the map height,
    // leaving the bottom 30% as the main player start zone and keeping
    // at least 3 rows between each barrier so every inter-door zone is
    // large enough to hold corridors, enemies, and pickups.
    const MIN_MAIN_ZONE_ROWS = 6; // fewest rows the player start zone may have
    const mainZoneRows = Math.max(MIN_MAIN_ZONE_ROWS, Math.floor(rows * 0.30));
    const doorAreaTop  = 3;                         // first door no earlier than row 3
    const doorAreaBot  = rows - 2 - mainZoneRows;   // last door above the main zone
    const doorRows  = [];
    const doorCols  = [];
    for (let d = 0; d < doorCount; d++) {
      // Centre each door in its equal-width bucket for even distribution.
      let dr = doorAreaTop + Math.round(
        (d + 0.5) * (doorAreaBot - doorAreaTop) / Math.max(doorCount, 1)
      );
      // clamp & deduplicate
      dr = Math.max(3, Math.min(dr, rows - 3));
      while (doorRows.includes(dr)) dr++;
      doorRows.push(dr);
      // Odd column for door so it aligns cleanly with maze cells
      const dc = _pickOdd(3, cols - 4);
      doorCols.push(dc);
      // Assign color based on player encounter order (last door = first encountered = yellow)
      const playerDoorIdx = doorCount - 1 - d;
      grid[dr * cols + dc] = _DOOR_COLOR_TILES[playerDoorIdx % 4];
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
      enemyCount + scannerCount + snifferCount + fastCount + heavyCount,
      mainStart, mainEnd
    );

    // ── 7. Ammo pickups ─────────────────────────────────────
    // Place ammo near enemy corridor rows (danger zones) so the player
    // must take a risk to collect it.  The full playable area (row 2 to
    // mainEnd) is searched so that post-door zones also receive pickups,
    // giving the player incentive to push further after each door.
    const playerRow = rows - 2;
    const playerCol = 1;
    _placeAmmoNearCorridors(grid, cols, ammoCount, corridorRows,
                            2, mainEnd, playerCol, playerRow);

    // ── 7b. Demolition perk (one per level) ─────────────────
    // Search the full playable area so the perk can appear in any zone,
    // including post-door sections, rewarding thorough exploration.
    _placePickups(grid, cols, 1, P, 2, mainEnd, playerCol, playerRow, 6);

    // ── 8. Key placeholders (one per zone, color-matched to door) ──
    // Zone 0 (main zone) gets yellow key, zone 1 gets red, zone 2 blue, etc.
    // Each key is placed in the zone directly below its matching door.
    const n = doorRows.length;
    for (let i = 0; i < doorCount; i++) {
      const keyTile = _KEY_COLOR_TILES[i % 4];
      let zoneTop, zoneBot;
      if (i === 0) {
        // Main zone: between last door (closest to player) and map bottom
        zoneTop = n > 0 ? doorRows[n - 1] + 1 : mainStart;
        zoneBot = mainEnd;
      } else {
        // Zone i: between door[n-1-i] (upper) and door[n-i] (lower)
        const upperDoor = doorRows[n - 1 - i];
        const lowerDoor = doorRows[n - i];
        zoneTop = upperDoor + 1;
        zoneBot = lowerDoor - 1;
      }
      if (zoneTop <= zoneBot) {
        const minDist = (i === 0) ? 4 : 2;
        _placePickups(grid, cols, 1, keyTile, zoneTop, zoneBot, playerCol, playerRow, minDist);
      }
    }

    // ── 9. Player start ─────────────────────────────────────
    grid[playerRow * cols + playerCol] = F;

    // ── 10. Generate enemy definitions ──────────────────────
    const enemies = _buildEnemies(
      cols, enemyCount, scannerCount, snifferCount, fastCount, heavyCount,
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
      doorRows, // exposed so game.js can pass to puzzle placement
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

    // ── One or two corridors per inter-door zone ─────────────
    // Zones are now larger (doors are spread across most of the map), so
    // zones with 8+ rows receive a second corridor.  Two patrol paths
    // per zone means enemies cover the space properly and the player
    // faces challenge throughout each phase.
    // DUAL_CORRIDOR_THRESHOLD: zones taller than this get a second highway
    // so the upper and lower halves of the zone both see enemy patrols.
    const DUAL_CORRIDOR_THRESHOLD = 8;
    let prev = 1; // exit row
    for (const dr of doorRows) {
      const zStart = prev + 1, zEnd = dr - 1;
      if (zEnd > zStart + 1) { // zone has room for at least one corridor
        const zoneHeight = zEnd - zStart;
        const numCorridors = zoneHeight >= DUAL_CORRIDOR_THRESHOLD ? 2 : 1;
        for (let n = 0; n < numCorridors; n++) {
          const cr = Math.floor(
            zStart + (n + 1) * (zEnd - zStart + 1) / (numCorridors + 1)
          );
          if (!doorRows.includes(cr) && cr > 1 && cr < rows - 1) {
            _openRow(grid, cols, cr);
            corridorRows.push({ row: cr, zone: 'upper' });
          }
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

  function _buildEnemies(cols, enemyCount, scannerCount, snifferCount, fastCount, heavyCount,
                         corridorRows, doorRows,
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
    for (let i = 0; i < snifferCount; i++) {
      allEnemySlots.push({ type: 'sniffer_bot', idx: i });
    }
    for (let i = 0; i < fastCount; i++) {
      allEnemySlots.push({ type: 'fast_bot', idx: i });
    }
    for (let i = 0; i < heavyCount; i++) {
      allEnemySlots.push({ type: 'heavy_bot', idx: i });
    }

    // Distribute enemy slots across corridors, interleaving main and upper
    // zones so that post-door sections always receive patrol coverage.
    const corridorCycle = [];
    const maxLen = Math.max(mainCorridors.length, upperCorridors.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < mainCorridors.length)  corridorCycle.push(mainCorridors[i]);
      if (i < upperCorridors.length) corridorCycle.push(upperCorridors[i]);
    }
    if (corridorCycle.length === 0) return enemies;

    allEnemySlots.forEach((slot, slotIdx) => {
      const corr  = corridorCycle[slotIdx % corridorCycle.length];
      const row   = corr.row;
      const isScannerBot = slot.type === 'scanner_bot';

      // ── Patrol style ────────────────────────────────────────
      let colA, colB;
      if (!isScannerBot && slotIdx % 3 === 2 && cols > 20) {
        const edgeMargin = Math.floor(cols * 0.30);
        colA = edgeMargin;
        colB = cols - 1 - edgeMargin;
      } else {
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

  // ── Puzzle element placement ─────────────────────────────

  // The set of "base" tiles considered FLOOR for puzzle placement purposes.
  const _FLOOR_TILES = new Set([F]);
  const _KEY_TILES   = new Set([K, K_R, K_B, K_G]);

  // Scale: fraction of keys that get puzzle-gated (0 = none, 1 = all).
  // Levels start at 0 (level 1 = no puzzles) and ramp up with difficulty.
  function _puzzleDensity(config) {
    // Per-level override takes priority (used by hand-designed puzzle levels).
    if (config.puzzleDensityOverride !== undefined) return config.puzzleDensityOverride;
    const em = config.enemySpeedMult || 1.0;
    // Density: 0 for first level (enemySpeedMult≈0.85), up to 0.9 for hardest
    if (em < 0.9)  return 0;
    if (em < 1.0)  return 0.25;
    if (em < 1.15) return 0.4;
    if (em < 1.25) return 0.6;
    return 0.75;
  }

  function _placePuzzleElements(grid, cols, rows, doorRows, playerCol, playerRow, config) {
    const density = _puzzleDensity(config);
    const puzzleLinks = [];

    // Per-level flags — allow level configs to restrict which puzzle types appear.
    // puzzleDoorType:    'timed' | 'oneway' | null (null = random mix)
    // puzzleNoLasers:    true → skip laser emitter placement
    // puzzleNoConveyors: true → skip conveyor tile placement
    // puzzleNoTraps:     true → skip trap tile placement
    const forcedDoorType  = config.puzzleDoorType    || null;
    const noLasers        = config.puzzleNoLasers    || false;
    const noConveyors     = config.puzzleNoConveyors || false;
    const noTraps         = config.puzzleNoTraps     || false;

    // ── Find all key positions in the grid ──────────────────
    const keyPositions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (_KEY_TILES.has(grid[r * cols + c])) {
          keyPositions.push({ col: c, row: r });
        }
      }
    }
    if (keyPositions.length === 0 || density === 0) return puzzleLinks;

    // ── 1. Pressure-plate + door pairs ───────────────────────
    for (const kp of keyPositions) {
      if (Math.random() > density) continue;

      // Choose door type: forced by level config, or random mix.
      const type     = forcedDoorType || (Math.random() < 0.55 ? 'timed' : 'oneway');
      const doorTile = type === 'timed' ? TD : OW;

      // Find a floor tile near the key to place the blocking door.
      const doorPos = _findGateTile(grid, cols, rows, kp, playerRow);
      if (!doorPos) continue;

      // Find a floor tile between doorPos and player start for the plate.
      const platePos = _findPlateTile(grid, cols, rows, doorPos, playerRow);
      if (!platePos) continue;

      // Place tiles and record link.
      grid[doorPos.row  * cols + doorPos.col]  = doorTile;
      grid[platePos.row * cols + platePos.col] = PP;
      puzzleLinks.push({ plate: platePos, door: doorPos, type });
    }

    // ── 2. Laser emitters ────────────────────────────────────
    // Place horizontal laser emitters on wall tiles adjacent to wide corridors.
    // A "wide corridor row" is a row with ≥40 % of interior tiles as floor.
    if (!noLasers) {
      const laserMax = Math.max(1, Math.floor(keyPositions.length * density * 0.6));
      let laserPlaced = 0;
      for (let r = 3; r < rows - 3 && laserPlaced < laserMax; r++) {
        if (doorRows.includes(r)) continue;
        let floorCount = 0;
        for (let c = 1; c < cols - 1; c++) {
          if (grid[r * cols + c] === F) floorCount++;
        }
        if (floorCount < (cols - 2) * 0.4) continue;

        // Look for a wall tile in this row that has floor on both horizontal sides.
        for (let c = 3; c < cols - 3; c++) {
          if (grid[r * cols + c] !== W) continue;
          if (grid[r * cols + c - 1] === F && grid[r * cols + c + 1] === F) {
            // Ensure beam would reach ≥2 floor tiles on each side before hitting a wall.
            let leftFloors = 0, rightFloors = 0;
            for (let dc = -1; dc >= -4; dc--) {
              if (c + dc < 1 || grid[r * cols + c + dc] !== F) break;
              leftFloors++;
            }
            for (let dc = 1; dc <= 4; dc++) {
              if (c + dc >= cols - 1 || grid[r * cols + c + dc] !== F) break;
              rightFloors++;
            }
            if (leftFloors >= 1 && rightFloors >= 1) {
              grid[r * cols + c] = LH;
              laserPlaced++;
              break;
            }
          }
        }
      }
    }

    // ── 3. Conveyor tiles ────────────────────────────────────
    if (!noConveyors) {
      const convMax     = Math.max(2, Math.floor(cols * rows * density * 0.003));
      const convDirs    = [CR, CL, CU, CD];
      let convPlaced    = 0;

      for (let attempts = 0; attempts < 200 && convPlaced < convMax; attempts++) {
        const r = 2 + ((Math.random() * (rows - 4)) | 0);
        const c = 1 + ((Math.random() * (cols - 2)) | 0);
        if (grid[r * cols + c] !== F) continue;
        // Don't place conveyors too close to player start.
        if (Math.abs(r - playerRow) + Math.abs(c - playerCol) < 6) continue;
        // Don't place directly adjacent to keys (preserve key readability).
        let nearKey = false;
        for (const kp of keyPositions) {
          if (Math.abs(kp.row - r) + Math.abs(kp.col - c) < 2) { nearKey = true; break; }
        }
        if (nearKey) continue;

        grid[r * cols + c] = convDirs[(Math.random() * 4) | 0];
        convPlaced++;
      }
    }

    // ── 4. Trap tiles ────────────────────────────────────────
    // Place one trap per key as an adjacent floor hazard (beside the key, not
    // on the path toward it so the player triggers it when grabbing the key).
    if (!noTraps) {
      for (const kp of keyPositions) {
        if (Math.random() > density) continue;
        // Collect floor neighbours of the key.
        const neighbours = [];
        for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nc = kp.col + dc, nr = kp.row + dr;
          if (nc < 1 || nc >= cols - 1 || nr < 2 || nr >= rows - 1) continue;
          if (grid[nr * cols + nc] === F) neighbours.push({ col: nc, row: nr });
        }
        if (neighbours.length > 0) {
          const tp = neighbours[(Math.random() * neighbours.length) | 0];
          grid[tp.row * cols + tp.col] = TR;
        }
      }
    }

    return puzzleLinks;
  }

  // Find a floor tile adjacent-to or near the key to serve as a blocking door.
  // Prefers tiles that are between the key and player (row >= kp.row, since
  // the player starts at the bottom = highest row index).
  function _findGateTile(grid, cols, rows, kp, playerRow) {
    const { col: kc, row: kr } = kp;

    // Search in Manhattan shells outward from the key.
    for (let dist = 1; dist <= 5; dist++) {
      const candidates = [];
      for (let dr = -dist; dr <= dist; dr++) {
        for (let dc = -(dist - Math.abs(dr)); dc <= (dist - Math.abs(dr)); dc += Math.max(1, dist - Math.abs(dr)) * 2 || 1) {
          const r = kr + dr;
          const c = kc + dc;
          if (r < 2 || r >= rows - 1 || c < 1 || c >= cols - 1) continue;
          if (grid[r * cols + c] !== F) continue;
          if (r < kr) continue; // Must be on player side (below the key)
          candidates.push({ col: c, row: r });
        }
      }
      // Also check exact Manhattan shell to be thorough.
      for (let dr = -dist; dr <= dist; dr++) {
        for (let dc = -dist; dc <= dist; dc++) {
          if (Math.abs(dr) + Math.abs(dc) !== dist) continue;
          const r = kr + dr;
          const c = kc + dc;
          if (r < 2 || r >= rows - 1 || c < 1 || c >= cols - 1) continue;
          if (grid[r * cols + c] !== F) continue;
          if (r < kr) continue;
          if (!candidates.some(ca => ca.col === c && ca.row === r)) {
            candidates.push({ col: c, row: r });
          }
        }
      }
      if (candidates.length > 0) {
        // Prefer tiles closer to player (higher row).
        candidates.sort((a, b) => b.row - a.row);
        return candidates[0];
      }
    }
    return null;
  }

  // Find a floor tile "between" the door and the player start to place the plate.
  // The plate must be reachable before the door and provide a puzzle.
  function _findPlateTile(grid, cols, rows, doorPos, playerRow) {
    const { col: dc, row: dr } = doorPos;
    const candidates = [];

    // Search tiles below (toward player) the door.
    for (let r = dr + 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (grid[r * cols + c] !== F) continue;
        const mDist = Math.abs(r - dr) + Math.abs(c - dc);
        if (mDist < 2 || mDist > 12) continue;
        candidates.push({ col: c, row: r, mDist });
      }
    }
    if (candidates.length === 0) return null;

    _shuffle(candidates);
    // Pick a candidate in the mid-range of distances for best puzzle layout.
    candidates.sort((a, b) => a.mDist - b.mDist);
    const idx = Math.min(candidates.length - 1, Math.floor(candidates.length * 0.35));
    return candidates[idx];
  }

  return { generate, addPuzzleElements: _placePuzzleElements };
})();
