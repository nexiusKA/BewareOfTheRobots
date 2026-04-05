// ── level.js ────────────────────────────────────────────────
// Level configuration — 10 sectors.
//
// Maps are now generated procedurally by MapGen (mapgen.js) using
// these configs.  No tile data is stored here.
//
// Fields:
//   cols, rows          — map dimensions in tiles
//   startBombs          — starting bomb ammo
//   keyCount            — keys required to unlock all doors
//   doorCount           — number of locked door barriers
//   ammoCount           — number of ammo pickup crates
//   enemyCount          — number of standard patrol robots
//   scannerCount        — number of scanner robots
//   extraPassageRate    — fraction of extra walls removed from maze (higher = more open)
//   enemySpeedMult      — multiplier applied to all enemy base speeds
//   visionMult          — multiplier applied to enemy vision range and angle
//   minKeyDist          — minimum Manhattan distance from player start for key placement

const Levels = (() => {

  const _levels = [
    // ── Sector 1: Introduction — movement, key, door, single guard ───────────
    // Small, very open map. One slow GuardBot with a wide patrol the player
    // can easily sidestep. Key is visible in the maze; door blocks the exit.
    // No bombs, no puzzles — pure tutorial.
    { cols: 22, rows: 18, startBombs: 0, keyCount: 1, doorCount: 1,
      ammoCount: 0, enemyCount: 1, scannerCount: 0,
      snifferCount: 0, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.42, enemySpeedMult: 0.70, visionMult: 0.72,
      minKeyDist: 5 },

    // ── Sector 2: Exploration & Timing — side path, two guards ───────────────
    // Small-medium map. Key is hidden off the main corridor so the player must
    // explore. Two GuardBots whose paths cross at least once, introducing the
    // timing challenge. One ammo crate as a reward for exploring.
    { cols: 26, rows: 20, startBombs: 1, keyCount: 1, doorCount: 1,
      ammoCount: 1, enemyCount: 2, scannerCount: 0,
      snifferCount: 0, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.25, enemySpeedMult: 0.80, visionMult: 0.80,
      minKeyDist: 8 },

    // ── Sector 3: Multi-phase + ScannerBot intro — two keys, two doors ────────
    // Medium map split into two distinct areas by the first door. Phase 1 uses
    // a GuardBot; Phase 2 introduces the ScannerBot guarding the second key.
    // No traps or pressure plates — focus is on planning the route.
    { cols: 30, rows: 22, startBombs: 1, keyCount: 2, doorCount: 2,
      ammoCount: 2, enemyCount: 1, scannerCount: 1,
      snifferCount: 0, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.18, enemySpeedMult: 0.88, visionMult: 0.88,
      minKeyDist: 8 },

    // ── Sector 4: Pressure Plate Intro — plate → gate → key flow ──────────────
    // Medium map with one key-door phase and two GuardBots.
    // A one-way gate (tile: ONE_WAY_DOOR/OW) blocks access to the key area;
    // a pressure plate nearby opens it permanently.  No lasers, conveyors,
    // or traps so the new mechanic reads clearly.  After grabbing the key and
    // unlocking the main door the player still faces one guarded corridor before
    // the exit.
    { cols: 32, rows: 26, startBombs: 1, keyCount: 1, doorCount: 1,
      ammoCount: 1, enemyCount: 2, scannerCount: 0,
      snifferCount: 0, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.22, enemySpeedMult: 0.93, visionMult: 0.92,
      minKeyDist: 10,
      puzzleDensityOverride: 1.0, puzzleDoorType: 'oneway',
      puzzleNoLasers: true, puzzleNoConveyors: true, puzzleNoTraps: true },

    // ── Sector 5: Laser System Intro — disable emitters, reach the key ────────
    // Wider map with a different aspect ratio.  Laser beams cross corridors on
    // the route to the key.  One GuardBot + one ScannerBot add pressure while
    // the player bombs emitters or routes around them.  Pressure-plate gates
    // are still present so both mechanics appear together.
    { cols: 36, rows: 26, startBombs: 1, keyCount: 1, doorCount: 1,
      ammoCount: 2, enemyCount: 1, scannerCount: 1,
      snifferCount: 0, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.20, enemySpeedMult: 0.98, visionMult: 0.96,
      minKeyDist: 11,
      puzzleDensityOverride: 0.85,
      puzzleNoConveyors: true, puzzleNoTraps: true },

    // ── Sector 6: Timed Door + Multi-Stage Planning ───────────────────────────
    // Two-door map.  Both keys are gated by timed doors: the player must step
    // on each pressure plate and move through the opening before it closes.
    // Two GuardBots and a ScannerBot make every dash dangerous.  The larger
    // map means planning the route — not just raw speed — decides success.
    { cols: 38, rows: 28, startBombs: 1, keyCount: 2, doorCount: 2,
      ammoCount: 2, enemyCount: 2, scannerCount: 1,
      snifferCount: 0, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.18, enemySpeedMult: 1.02, visionMult: 1.00,
      minKeyDist: 11,
      puzzleDensityOverride: 0.9, puzzleDoorType: 'timed',
      puzzleNoConveyors: true, puzzleNoTraps: true },

    // ── Sector 7: Heavy Bot — first armored enemy ─────────────────────────────
    { cols: 48, rows: 36, startBombs: 1, keyCount: 3, doorCount: 3,
      ammoCount: 3, enemyCount: 6, scannerCount: 2,
      snifferCount: 1, fastCount: 1, heavyCount: 1,
      extraPassageRate: 0.08, enemySpeedMult: 1.20, visionMult: 1.20,
      minKeyDist: 12 },

    // ── Sector 8: Four doors — full color cycle ───────────────────────────────
    { cols: 50, rows: 36, startBombs: 1, keyCount: 4, doorCount: 4,
      ammoCount: 3, enemyCount: 7, scannerCount: 2,
      snifferCount: 2, fastCount: 1, heavyCount: 1,
      extraPassageRate: 0.07, enemySpeedMult: 1.25, visionMult: 1.25,
      minKeyDist: 13 },

    // ── Sector 9: High tension — multiple special enemies ─────────────────────
    { cols: 52, rows: 38, startBombs: 1, keyCount: 4, doorCount: 4,
      ammoCount: 3, enemyCount: 7, scannerCount: 2,
      snifferCount: 2, fastCount: 2, heavyCount: 1,
      extraPassageRate: 0.06, enemySpeedMult: 1.30, visionMult: 1.30,
      minKeyDist: 14 },

    // ── Sector 10: Endgame — every resource counts ────────────────────────────
    { cols: 54, rows: 40, startBombs: 1, keyCount: 5, doorCount: 5,
      ammoCount: 3, enemyCount: 8, scannerCount: 3,
      snifferCount: 2, fastCount: 2, heavyCount: 2,
      extraPassageRate: 0.05, enemySpeedMult: 1.40, visionMult: 1.40,
      minKeyDist: 15 },
  ];

  function get(index)  { return _levels[index] || null; }
  function count()     { return _levels.length; }

  return { get, count };
})();
