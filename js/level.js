// ── level.js ────────────────────────────────────────────────
// Level configuration — 10 sectors.
//
// Maps are now generated procedurally by MapGen (mapgen.js) using
// these configs.  No tile data is stored here.
//
// Fields:
//   cols, rows        — map dimensions in tiles
//   startBombs        — starting bomb ammo
//   keyCount          — keys required to unlock all doors
//   doorCount         — number of locked door barriers
//   ammoCount         — number of ammo pickup crates
//   enemyCount        — number of standard patrol robots
//   scannerCount      — number of scanner robots

const Levels = (() => {

  const _levels = [
    // ── Sector 1 ────────────────────────────────────────────
    { cols: 40, rows: 28, startBombs: 3, keyCount: 1, doorCount: 1,
      ammoCount: 2, enemyCount: 6, scannerCount: 1 },

    // ── Sector 2 ────────────────────────────────────────────
    { cols: 42, rows: 30, startBombs: 3, keyCount: 2, doorCount: 2,
      ammoCount: 2, enemyCount: 6, scannerCount: 1 },

    // ── Sector 3 ────────────────────────────────────────────
    { cols: 44, rows: 32, startBombs: 2, keyCount: 2, doorCount: 2,
      ammoCount: 2, enemyCount: 6, scannerCount: 1 },

    // ── Sector 4 ────────────────────────────────────────────
    { cols: 46, rows: 34, startBombs: 2, keyCount: 3, doorCount: 3,
      ammoCount: 2, enemyCount: 7, scannerCount: 1 },

    // ── Sector 5 ────────────────────────────────────────────
    { cols: 48, rows: 36, startBombs: 2, keyCount: 3, doorCount: 3,
      ammoCount: 3, enemyCount: 7, scannerCount: 1 },

    // ── Sector 6 ────────────────────────────────────────────
    { cols: 50, rows: 38, startBombs: 2, keyCount: 3, doorCount: 3,
      ammoCount: 3, enemyCount: 7, scannerCount: 1 },

    // ── Sector 7 ────────────────────────────────────────────
    { cols: 52, rows: 40, startBombs: 1, keyCount: 4, doorCount: 4,
      ammoCount: 3, enemyCount: 7, scannerCount: 2 },

    // ── Sector 8 ────────────────────────────────────────────
    { cols: 54, rows: 42, startBombs: 1, keyCount: 4, doorCount: 4,
      ammoCount: 3, enemyCount: 7, scannerCount: 2 },

    // ── Sector 9 ────────────────────────────────────────────
    { cols: 56, rows: 44, startBombs: 1, keyCount: 4, doorCount: 4,
      ammoCount: 3, enemyCount: 8, scannerCount: 2 },

    // ── Sector 10 ───────────────────────────────────────────
    { cols: 58, rows: 46, startBombs: 1, keyCount: 5, doorCount: 5,
      ammoCount: 3, enemyCount: 8, scannerCount: 2 },
  ];

  function get(index)  { return _levels[index] || null; }
  function count()     { return _levels.length; }

  return { get, count };
})();
