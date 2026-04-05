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

    // ── Sector 4: Sniffer introduced — detects through walls ─────────────────
    { cols: 42, rows: 32, startBombs: 2, keyCount: 2, doorCount: 2,
      ammoCount: 3, enemyCount: 5, scannerCount: 1,
      snifferCount: 1, fastCount: 0, heavyCount: 0,
      extraPassageRate: 0.12, enemySpeedMult: 1.05, visionMult: 1.05,
      minKeyDist: 10 },

    // ── Sector 5: Three zones — FastBot adds pressure ─────────────────────────
    { cols: 44, rows: 32, startBombs: 2, keyCount: 3, doorCount: 3,
      ammoCount: 4, enemyCount: 6, scannerCount: 1,
      snifferCount: 1, fastCount: 1, heavyCount: 0,
      extraPassageRate: 0.10, enemySpeedMult: 1.10, visionMult: 1.10,
      minKeyDist: 11 },

    // ── Sector 6: High patrol density — all three color doors ────────────────
    { cols: 46, rows: 34, startBombs: 2, keyCount: 3, doorCount: 3,
      ammoCount: 4, enemyCount: 6, scannerCount: 1,
      snifferCount: 1, fastCount: 1, heavyCount: 0,
      extraPassageRate: 0.09, enemySpeedMult: 1.15, visionMult: 1.15,
      minKeyDist: 12 },

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
