// ── level.js ────────────────────────────────────────────────
// Level definitions: tile data, player start, enemy patrol routes.
//
// All levels are BFS-verified:
//   • Exit is NOT reachable without opening doors.
//   • Exit IS reachable once all doors are opened.
//   • All keys are reachable from the player start.

const Levels = (() => {

  // Tile shorthand
  const W = 1; // wall
  const _ = 0; // floor
  const D = 2; // door (locked)
  const K = 4; // key
  const E = 5; // exit

  /*
   * Level descriptor shape:
   * {
   *   cols, rows,
   *   map: flat row-major array,
   *   playerStart: { col, row },
   *   enemies: [{
   *     patrol: [{col,row}, ...],
   *     speed: number (tiles/sec),
   *     visionRange: number (pixels),
   *     visionAngle: number (half-angle, radians),
   *   }]
   * }
   *
   * Zone structure for all levels:
   *   Top zone   (row 1)       → exit
   *   Separator  (row 2)       → door
   *   ...inner zones...
   *   Bottom zone (last rows)  → player start + keys
   *
   * Enemy patrols never start at the player spawn tile.
   */

  // ── Level 1 (17×11) — 1 key, 1 door ───────────────────────
  // Player: (1,9)   Key: (3,9)   Door: (8,2)   Exit: (15,1)
  const level1 = {
    cols: 17,
    rows: 11,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1  — exit at (15,1)
      W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,   // row 2  — door at (8,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 4
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 5
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 6
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,W,_,_,W,W,_,_,_,_,W,W,_,_,W,   // row 8
      W,_,_,K,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 9  — key at (3,9); player at (1,9)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 10
    ],
    playerStart: { col: 1, row: 9 },
    enemies: [
      // Top zone guard — starts at left end of top corridor
      {
        patrol: [
          { col: 1, row: 1 },
          { col: 14, row: 1 },
        ],
        speed: 1.6,
        visionRange: 180,
        visionAngle: Math.PI / 3,
      },
      // Middle corridor guard — starts at far right, away from player
      {
        patrol: [
          { col: 15, row: 5 },
          { col: 1, row: 5 },
        ],
        speed: 1.5,
        visionRange: 170,
        visionAngle: Math.PI / 3,
      },
      // Bottom zone guard — starts at right side, far from player spawn
      {
        patrol: [
          { col: 15, row: 9 },
          { col: 7, row: 9 },
        ],
        speed: 1.7,
        visionRange: 160,
        visionAngle: Math.PI / 3,
      },
    ],
  };

  // ── Level 2 (19×13) — 2 keys, 2 doors ─────────────────────
  // Player: (1,11)   Keys: (3,11),(12,11)
  // Doors: (10,6),(5,2)   Exit: (17,1)
  const level2 = {
    cols: 19,
    rows: 13,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1  — exit at (17,1)
      W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 2  — door at (5,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,   // row 4
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 5
      W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,   // row 6  — door at (10,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,   // row 8
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 9
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 10
      W,_,_,K,_,_,_,_,_,_,_,_,K,_,_,_,_,_,W,   // row 11 — keys at (3,11),(12,11); player at (1,11)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 12
    ],
    playerStart: { col: 1, row: 11 },
    enemies: [
      // Top zone guard
      {
        patrol: [
          { col: 1, row: 1 },
          { col: 16, row: 1 },
        ],
        speed: 2.0,
        visionRange: 190,
        visionAngle: Math.PI / 3,
      },
      // Mid zone left guard
      {
        patrol: [
          { col: 1, row: 3 },
          { col: 8, row: 3 },
          { col: 8, row: 5 },
          { col: 1, row: 5 },
        ],
        speed: 1.8,
        visionRange: 175,
        visionAngle: Math.PI / 2.8,
      },
      // Mid zone right guard
      {
        patrol: [
          { col: 11, row: 3 },
          { col: 17, row: 3 },
          { col: 17, row: 5 },
          { col: 11, row: 5 },
        ],
        speed: 2.2,
        visionRange: 168,
        visionAngle: Math.PI / 2.5,
      },
      // Bottom corridor guard — starts at right side, away from player
      {
        patrol: [
          { col: 17, row: 7 },
          { col: 7, row: 7 },
        ],
        speed: 1.9,
        visionRange: 172,
        visionAngle: Math.PI / 3,
      },
      // Bottom maze rover — starts at far right corner
      {
        patrol: [
          { col: 17, row: 11 },
          { col: 5, row: 11 },
        ],
        speed: 2.1,
        visionRange: 165,
        visionAngle: Math.PI / 2.8,
      },
    ],
  };

  // ── Level 3 (21×15) — 3 keys, 3 doors ─────────────────────
  // Player: (1,13)   Keys: (3,13),(10,13),(16,13)
  // Doors: (13,10),(7,6),(11,2)   Exit: (19,1)
  const level3 = {
    cols: 21,
    rows: 15,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1  — exit at (19,1)
      W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,   // row 2  — door at (11,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 4
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 5
      W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 6  — door at (7,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 8
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 9
      W,W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,   // row 10 — door at (13,10)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 11
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 12
      W,_,_,K,_,_,_,_,_,_,K,_,_,_,_,_,K,_,_,_,W,   // row 13 — keys at (3,13),(10,13),(16,13); player at (1,13)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 14
    ],
    playerStart: { col: 1, row: 13 },
    enemies: [
      // Top zone sweeper (fast)
      {
        patrol: [
          { col: 1, row: 1 },
          { col: 18, row: 1 },
        ],
        speed: 2.4,
        visionRange: 195,
        visionAngle: Math.PI / 3,
      },
      // Upper mid left guard
      {
        patrol: [
          { col: 1, row: 3 },
          { col: 5, row: 3 },
          { col: 5, row: 5 },
          { col: 1, row: 5 },
        ],
        speed: 2.0,
        visionRange: 178,
        visionAngle: Math.PI / 2.8,
      },
      // Upper mid right guard
      {
        patrol: [
          { col: 12, row: 3 },
          { col: 19, row: 3 },
          { col: 19, row: 5 },
          { col: 12, row: 5 },
        ],
        speed: 2.3,
        visionRange: 172,
        visionAngle: Math.PI / 2.5,
      },
      // Lower mid horizontal patrol
      {
        patrol: [
          { col: 1, row: 7 },
          { col: 19, row: 7 },
        ],
        speed: 2.0,
        visionRange: 185,
        visionAngle: Math.PI / 3,
      },
      // Lower mid cross patrol — stays within rows 7-9
      {
        patrol: [
          { col: 19, row: 9 },
          { col: 1, row: 9 },
        ],
        speed: 2.1,
        visionRange: 175,
        visionAngle: Math.PI / 2.8,
      },
      // Bottom zone key guardian — starts at far right, away from player
      {
        patrol: [
          { col: 19, row: 13 },
          { col: 5, row: 13 },
        ],
        speed: 2.2,
        visionRange: 180,
        visionAngle: Math.PI / 3,
      },
    ],
  };

  const _levels = [level1, level2, level3];

  function get(index) {
    return _levels[index] || null;
  }

  function count() {
    return _levels.length;
  }

  return { get, count };
})();
