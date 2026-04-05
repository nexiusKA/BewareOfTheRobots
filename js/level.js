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
    // Teaches basic patrol avoidance.  Single door sits mid-map; after
    // opening it the player still faces a guarded corridor to the exit.
    { cols: 36, rows: 26, startBombs: 3, keyCount: 1, doorCount: 1,
      ammoCount: 3, enemyCount: 4, scannerCount: 0,
      extraPassageRate: 0.20, enemySpeedMult: 0.85, visionMult: 0.85,
      minKeyDist: 8 },

    // ── Sector 2: First scanner — introduces wide-angle vision ───────────────
    // One scanner bot shows the player that vision angles vary.
    // Door is mid-map; a post-door patrol guards the final approach.
    { cols: 38, rows: 28, startBombs: 3, keyCount: 1, doorCount: 1,
      ammoCount: 3, enemyCount: 5, scannerCount: 1,
      extraPassageRate: 0.18, enemySpeedMult: 0.90, visionMult: 0.90,
      minKeyDist: 9 },

    // ── Sector 3: Two-phase challenge — two doors, two guarded zones ─────────
    // Each inter-door zone has its own patrol corridor, so the player
    // cannot relax after the first door.
    { cols: 40, rows: 30, startBombs: 2, keyCount: 2, doorCount: 2,
      ammoCount: 3, enemyCount: 5, scannerCount: 1,
      extraPassageRate: 0.14, enemySpeedMult: 1.00, visionMult: 1.00,
      minKeyDist: 10 },

    // ── Sector 4: Overlapping vision — two enemy types share corridors ────────
    // Guards and a scanner overlap across all zones; windows shrink after
    // each door as patrols tighten near the exit.
    { cols: 42, rows: 32, startBombs: 2, keyCount: 2, doorCount: 2,
      ammoCount: 3, enemyCount: 6, scannerCount: 1,
      extraPassageRate: 0.12, enemySpeedMult: 1.05, visionMult: 1.05,
      minKeyDist: 10 },

    // ── Sector 5: Three zones — first real resource tension ───────────────────
    // Three doors divide the map into distinct phases; ammo is scattered
    // across zones so the player must push into guarded areas to resupply.
    { cols: 44, rows: 32, startBombs: 2, keyCount: 3, doorCount: 3,
      ammoCount: 4, enemyCount: 6, scannerCount: 1,
      extraPassageRate: 0.10, enemySpeedMult: 1.10, visionMult: 1.10,
      minKeyDist: 11 },

    // ── Sector 6: High patrol density — enemies share corridors ──────────────
    // Multiple guards interact across all three post-door zones; safe
    // windows shrink as the player climbs toward the exit.
    { cols: 46, rows: 34, startBombs: 2, keyCount: 3, doorCount: 3,
      ammoCount: 4, enemyCount: 7, scannerCount: 1,
      extraPassageRate: 0.09, enemySpeedMult: 1.15, visionMult: 1.15,
      minKeyDist: 12 },

    // ── Sector 7: Limited ammo — one starting bomb, two scanners ─────────────
    // Player must earn every bomb through risk across all zones.  Maze
    // is noticeably tighter and post-door areas are closely watched.
    { cols: 48, rows: 36, startBombs: 1, keyCount: 3, doorCount: 3,
      ammoCount: 3, enemyCount: 7, scannerCount: 2,
      extraPassageRate: 0.08, enemySpeedMult: 1.20, visionMult: 1.20,
      minKeyDist: 12 },

    // ── Sector 8: Complex paths — four doors, scarce ammo ────────────────────
    // Four-phase navigation puzzle; wrong turns waste time under pressure
    // from enemies that patrol every zone up to the exit.
    { cols: 50, rows: 36, startBombs: 1, keyCount: 4, doorCount: 4,
      ammoCount: 3, enemyCount: 7, scannerCount: 2,
      extraPassageRate: 0.07, enemySpeedMult: 1.25, visionMult: 1.25,
      minKeyDist: 13 },

    // ── Sector 9: High tension — minimal safe zones ────────────────────────
    // Dense maze, fast enemies in every phase; planning required before
    // moving through each guarded door section.
    { cols: 52, rows: 38, startBombs: 1, keyCount: 4, doorCount: 4,
      ammoCount: 3, enemyCount: 8, scannerCount: 2,
      extraPassageRate: 0.06, enemySpeedMult: 1.30, visionMult: 1.30,
      minKeyDist: 14 },

    // ── Sector 10: Endgame — every resource counts ────────────────────────────
    // Maximum patrol density across five distinct zones; the final run
    // to the exit is as dangerous as the start.  Bomb placement and
    // careful timing are the only way through.
    { cols: 54, rows: 40, startBombs: 1, keyCount: 5, doorCount: 5,
      ammoCount: 3, enemyCount: 8, scannerCount: 3,
      extraPassageRate: 0.05, enemySpeedMult: 1.40, visionMult: 1.40,
      minKeyDist: 15 },
  ];

  function get(index)  { return _levels[index] || null; }
  function count()     { return _levels.length; }

  return { get, count };
})();
