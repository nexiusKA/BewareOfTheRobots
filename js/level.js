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
    // ── Sector 1: Tutorial — wide open, slow enemies, generous ammo ──────────
    // Teaches basic patrol avoidance.  Player has room to breathe.
    { cols: 36, rows: 26, startBombs: 3, keyCount: 1, doorCount: 1,
      ammoCount: 2, enemyCount: 4, scannerCount: 0,
      extraPassageRate: 0.20, enemySpeedMult: 0.85, visionMult: 0.85,
      minKeyDist: 8 },

    // ── Sector 2: First scanner — introduces wide-angle vision ───────────────
    // One scanner bot shows the player that vision angles vary.
    { cols: 38, rows: 28, startBombs: 3, keyCount: 1, doorCount: 1,
      ammoCount: 2, enemyCount: 5, scannerCount: 1,
      extraPassageRate: 0.18, enemySpeedMult: 0.90, visionMult: 0.90,
      minKeyDist: 9 },

    // ── Sector 3: First timing challenge — two zones, tighter paths ──────────
    // Two doors force the player to collect a key under patrol pressure.
    { cols: 40, rows: 30, startBombs: 2, keyCount: 2, doorCount: 2,
      ammoCount: 2, enemyCount: 5, scannerCount: 1,
      extraPassageRate: 0.14, enemySpeedMult: 1.00, visionMult: 1.00,
      minKeyDist: 10 },

    // ── Sector 4: Overlapping vision — two enemy types share corridors ────────
    // Guards and a scanner overlap, creating windows the player must exploit.
    { cols: 42, rows: 32, startBombs: 2, keyCount: 2, doorCount: 2,
      ammoCount: 2, enemyCount: 6, scannerCount: 1,
      extraPassageRate: 0.12, enemySpeedMult: 1.05, visionMult: 1.05,
      minKeyDist: 10 },

    // ── Sector 5: Three zones — first real resource tension ───────────────────
    // Three doors, tight corridors, ammo is a reward for risk.
    { cols: 44, rows: 32, startBombs: 2, keyCount: 3, doorCount: 3,
      ammoCount: 3, enemyCount: 6, scannerCount: 1,
      extraPassageRate: 0.10, enemySpeedMult: 1.10, visionMult: 1.10,
      minKeyDist: 11 },

    // ── Sector 6: High patrol density — enemies share corridors ──────────────
    // Multiple guards interact; safe windows shrink.  Bomb is precious.
    { cols: 46, rows: 34, startBombs: 2, keyCount: 3, doorCount: 3,
      ammoCount: 3, enemyCount: 7, scannerCount: 1,
      extraPassageRate: 0.09, enemySpeedMult: 1.15, visionMult: 1.15,
      minKeyDist: 12 },

    // ── Sector 7: Limited ammo — one starting bomb, two scanners ─────────────
    // Player must earn every bomb through risk.  Maze is noticeably tighter.
    { cols: 48, rows: 36, startBombs: 1, keyCount: 3, doorCount: 3,
      ammoCount: 2, enemyCount: 7, scannerCount: 2,
      extraPassageRate: 0.08, enemySpeedMult: 1.20, visionMult: 1.20,
      minKeyDist: 12 },

    // ── Sector 8: Complex paths — four doors, scarce ammo ────────────────────
    // Navigation becomes a puzzle; wrong turns waste time under pressure.
    { cols: 50, rows: 36, startBombs: 1, keyCount: 4, doorCount: 4,
      ammoCount: 2, enemyCount: 7, scannerCount: 2,
      extraPassageRate: 0.07, enemySpeedMult: 1.25, visionMult: 1.25,
      minKeyDist: 13 },

    // ── Sector 9: High tension — minimal safe zones ────────────────────────
    // Dense maze, fast enemies, planning required before moving.
    { cols: 52, rows: 38, startBombs: 1, keyCount: 4, doorCount: 4,
      ammoCount: 2, enemyCount: 8, scannerCount: 2,
      extraPassageRate: 0.06, enemySpeedMult: 1.30, visionMult: 1.30,
      minKeyDist: 14 },

    // ── Sector 10: Endgame — every resource counts ────────────────────────────
    // Maximum patrol density, five doors, three scanners.  Bomb placement
    // and careful timing are the only way through.
    { cols: 54, rows: 40, startBombs: 1, keyCount: 5, doorCount: 5,
      ammoCount: 2, enemyCount: 8, scannerCount: 3,
      extraPassageRate: 0.05, enemySpeedMult: 1.40, visionMult: 1.40,
      minKeyDist: 15 },
  ];

  function get(index)  { return _levels[index] || null; }
  function count()     { return _levels.length; }

  return { get, count };
})();
