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
    // ── Sector 1: Introduction & Timing — movement, exploration, two guards ───
    // Small-medium, open map.  The key is hidden just off the main corridor so
    // the player must explore.  Two slow GuardBots whose paths cross introduce
    // the timing challenge without being punishing.  One ammo crate rewards
    // exploration.  No scanners, no puzzles — learn to move and observe.
    { cols: 28, rows: 22, startBombs: 1, keyCount: 1, doorCount: 1,
      ammoCount: 1, enemyCount: 2, scannerCount: 0,
      snifferCount: 0, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.33, enemySpeedMult: 0.75, visionMult: 0.76,
      minKeyDist: 6 },

    // ── Sector 2: Systems Tutorial — scanner, pressure plate & laser combo ────
    // Medium map.  Phase 1 introduces the ScannerBot guarding one key behind a
    // pressure-plate one-way gate.  Phase 2 adds laser emitters on the corridor
    // to the second key — the player can bomb them or route around.  Both core
    // puzzle mechanics appear together so players enter the main game prepared.
    { cols: 34, rows: 26, startBombs: 1, keyCount: 2, doorCount: 2,
      ammoCount: 2, enemyCount: 1, scannerCount: 1,
      snifferCount: 0, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.20, enemySpeedMult: 0.93, visionMult: 0.90,
      minKeyDist: 9,
      puzzleDensityOverride: 0.85, puzzleDoorType: 'oneway',
      puzzleNoConveyors: true, puzzleNoTraps: true },

    // ── Sector 3: Timed Door + Multi-Stage Planning ───────────────────────────
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

    // ── Sector 4: MULTI-KEY CHAOS — first real complex puzzle ────────────────
    // Three colored keys (yellow/red/blue) locked behind three doors.  The map
    // is deliberately open (high extraPassageRate) so multiple branching paths
    // converge on a central hub.  Each branch hides one key behind a mix of
    // pressure-plate gates and patrolling robots, forcing the player to decide
    // which key to chase first.  No lasers, traps, or conveyors — the chaos
    // comes from overlapping patrol routes and wrong-path penalties.
    { cols: 44, rows: 34, startBombs: 2, keyCount: 3, doorCount: 3,
      ammoCount: 3, enemyCount: 2, scannerCount: 1,
      snifferCount: 1, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.22, enemySpeedMult: 1.10, visionMult: 1.10,
      minKeyDist: 12,
      puzzleDensityOverride: 0.70,
      puzzleNoLasers: true, puzzleNoConveyors: true, puzzleNoTraps: true },

    // ── Sector 5: LASER + TIMING HELL — lasers, timed doors, enemy pressure ──
    // Laser emitters block the corridors leading to both keys.  Every key zone
    // is gated by a timed pressure-plate door: the player must hit the plate,
    // sprint through the narrowing window, and collect the key while a
    // ScannerBot sweeps the far end and two GuardBots patrol the timing
    // corridor.  Extra bombs (startBombs: 2) let the player blast emitters but
    // ammo must be conserved — three crates are hidden near danger zones.
    { cols: 40, rows: 30, startBombs: 2, keyCount: 2, doorCount: 2,
      ammoCount: 3, enemyCount: 2, scannerCount: 1,
      snifferCount: 0, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.15, enemySpeedMult: 1.15, visionMult: 1.15,
      minKeyDist: 11,
      puzzleDensityOverride: 0.90, puzzleDoorType: 'timed',
      puzzleNoConveyors: true, puzzleNoTraps: true },

    // ── Sector 6: TRAP LEVEL — fake safety, one-way corridors, hidden traps ──
    // The map looks open but one-way doors seal exits behind the player and
    // trap tiles lurk on the obvious path.  A SnifferBot with radius-only
    // detection sniffs out hiding spots even through walls, so players cannot
    // simply wait for patrols to pass.  Doors close behind the player, turning
    // each phase into a commitment — there is no retreating once you enter.
    { cols: 46, rows: 36, startBombs: 1, keyCount: 3, doorCount: 3,
      ammoCount: 3, enemyCount: 2, scannerCount: 1,
      snifferCount: 1, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.10, enemySpeedMult: 1.22, visionMult: 1.22,
      minKeyDist: 13,
      puzzleDensityOverride: 0.85, puzzleDoorType: 'oneway',
      puzzleNoConveyors: true },

    // ── Sector 7: FINAL ESCAPE — ultimate test, every system active ──────────
    // Two keys, two doors, one exit.  Start in a tight entry corridor, push
    // into a large chaotic zone bristling with overlapping vision cones, then
    // make a final sprint through a laser-and-timed-door gauntlet as enemies
    // close in from behind.  All puzzle systems are live: lasers, timed doors,
    // one-way gates, traps, and conveyors.  A HeavyBot requires two bomb hits
    // to neutralize, rationing the four ammo crates.  The final stretch must
    // be earned — no empty run to the exit.
    { cols: 50, rows: 38, startBombs: 2, keyCount: 2, doorCount: 2,
      ammoCount: 4, enemyCount: 2, scannerCount: 1,
      snifferCount: 1, fastCount: 0, heavyCount: 1,
      extraPassageRate: 0.08, enemySpeedMult: 1.38, visionMult: 1.38,
      minKeyDist: 14,
      puzzleDensityOverride: 1.00 },

    // ── Sector 8: CHAOS SURGE — more enemies, bigger maze, all systems hot ───
    // A 52×40 arena with three colored keys spread across three heavily guarded
    // zones.  A FastBot makes reaction timing critical; a HeavyBot soaks two
    // bombs; SnifferBots patrol dead-ends where keys hide.  Every key is
    // puzzle-gated (density 1.0) with a full mix of timed doors, one-way gates,
    // lasers, traps, and conveyors.  More bombs and ammo crates offset the
    // increased enemy count — rationing is still essential.
    { cols: 52, rows: 40, startBombs: 3, keyCount: 3, doorCount: 3,
      ammoCount: 4, enemyCount: 3, scannerCount: 2,
      snifferCount: 1, fastCount: 1, heavyCount: 1,
      extraPassageRate: 0.18, enemySpeedMult: 1.52, visionMult: 1.52,
      minKeyDist: 15,
      puzzleDensityOverride: 1.00 },

    // ── Sector 9: MAXIMUM OVERDRIVE — four keys, elite enemies, tight maze ───
    // All four key colors appear for the first time: yellow, red, blue, and
    // green — each locked in its own zone behind a full barrier door.  The
    // maze is deliberately tight (low extraPassageRate) so every wrong turn
    // costs time while a FastBot and a pair of SnifferBots close in.  The
    // enemy speed multiplier jumps to 1.68, making patrols genuinely
    // threatening even with the player's bomb stock.
    { cols: 54, rows: 42, startBombs: 3, keyCount: 4, doorCount: 4,
      ammoCount: 5, enemyCount: 3, scannerCount: 2,
      snifferCount: 2, fastCount: 1, heavyCount: 1,
      extraPassageRate: 0.07, enemySpeedMult: 1.68, visionMult: 1.68,
      minKeyDist: 15,
      puzzleDensityOverride: 1.00 },

    // ── Sector 10: SINGULARITY — the true final test ──────────────────────────
    // Maximum map size, maximum enemy roster.  Four keys, four doors, every
    // puzzle system fully unleashed.  Two HeavyBots demand four bomb hits
    // between them; two FastBots eliminate any safe loitering; two SnifferBots
    // sniff out hiding spots through walls.  Enemy speed and vision are both
    // at 1.88×, making even brief exposure lethal.  The very low
    // extraPassageRate (0.05) creates a near-pure maze — navigation is as
    // dangerous as the enemies themselves.
    { cols: 58, rows: 44, startBombs: 3, keyCount: 4, doorCount: 4,
      ammoCount: 5, enemyCount: 4, scannerCount: 2,
      snifferCount: 2, fastCount: 2, heavyCount: 2,
      extraPassageRate: 0.05, enemySpeedMult: 1.88, visionMult: 1.88,
      minKeyDist: 16,
      puzzleDensityOverride: 1.00 },
  ];

  function get(index)  { return _levels[index] || null; }
  function count()     { return _levels.length; }

  return { get, count };
})();
