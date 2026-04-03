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
   */

  // ── Level 1 (13×9) — 1 key, 1 door ────────────────────────
  // Player: (1,7)   Key: (3,6)   Door: (6,2)   Exit: (11,1)
  const level1 = {
    cols: 13,
    rows: 9,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1 — exit at (11,1)
      W,W,W,W,W,W,D,W,W,W,W,W,W,   // row 2 — door at (6,2)
      W,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,W,W,_,W,W,W,_,W,_,W,   // row 4
      W,_,W,_,_,_,W,_,_,_,W,_,W,   // row 5
      W,_,W,K,W,_,W,_,W,_,_,_,W,   // row 6 — key at (3,6)
      W,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7 — player at (1,7)
      W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 8
    ],
    playerStart: { col: 1, row: 7 },
    enemies: [
      // Guard patrols the top zone (visible from door approach)
      {
        patrol: [
          { col: 1, row: 1 },
          { col: 10, row: 1 },
        ],
        speed: 1.6,
        visionRange: 168,
        visionAngle: Math.PI / 3,
      },
      // Guard patrols the bottom open corridor (row 7)
      {
        patrol: [
          { col: 1, row: 7 },
          { col: 11, row: 7 },
        ],
        speed: 1.4,
        visionRange: 144,
        visionAngle: Math.PI / 3,
      },
      // Roving guard in bottom maze
      {
        patrol: [
          { col: 6, row: 5 },
          { col: 6, row: 7 },
          { col: 9, row: 7 },
          { col: 9, row: 5 },
        ],
        speed: 1.7,
        visionRange: 152,
        visionAngle: Math.PI / 2.8,
      },
    ],
  };

  // ── Level 2 (15×11) — 2 keys, 2 doors ────────────────────
  // Player: (1,7)   Keys: (3,9),(10,9)   Doors: (7,6),(5,2)   Exit: (13,1)
  const level2 = {
    cols: 15,
    rows: 11,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1 — exit at (13,1)
      W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,   // row 2 — door at (5,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,W,W,_,W,W,W,_,W,W,W,_,W,   // row 4
      W,_,W,_,_,_,_,_,W,_,_,_,W,_,W,   // row 5
      W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,   // row 6 — door at (7,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7 — player at (1,7)
      W,_,W,W,W,_,W,W,W,_,W,W,W,_,W,   // row 8
      W,_,W,K,_,_,_,_,W,_,K,_,W,_,W,   // row 9 — keys at (3,9) and (10,9)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 10
    ],
    playerStart: { col: 1, row: 7 },
    enemies: [
      // Top zone guard
      {
        patrol: [
          { col: 1, row: 1 },
          { col: 12, row: 1 },
        ],
        speed: 2.0,
        visionRange: 180,
        visionAngle: Math.PI / 3,
      },
      // Mid zone left guard
      {
        patrol: [
          { col: 1, row: 3 },
          { col: 6, row: 3 },
          { col: 6, row: 5 },
          { col: 1, row: 5 },
        ],
        speed: 1.8,
        visionRange: 165,
        visionAngle: Math.PI / 2.8,
      },
      // Mid zone right guard
      {
        patrol: [
          { col: 9, row: 3 },
          { col: 13, row: 3 },
          { col: 13, row: 5 },
          { col: 9, row: 5 },
        ],
        speed: 2.2,
        visionRange: 158,
        visionAngle: Math.PI / 2.5,
      },
      // Bottom zone patrol
      {
        patrol: [
          { col: 1, row: 7 },
          { col: 13, row: 7 },
        ],
        speed: 1.9,
        visionRange: 162,
        visionAngle: Math.PI / 3,
      },
      // Bottom maze rover
      {
        patrol: [
          { col: 3, row: 9 },
          { col: 3, row: 8 },
          { col: 12, row: 8 },
          { col: 12, row: 9 },
        ],
        speed: 2.1,
        visionRange: 155,
        visionAngle: Math.PI / 2.8,
      },
    ],
  };

  // ── Level 3 (17×13) — 3 keys, 3 doors ────────────────────
  // Player: (1,11)   Keys: (4,11),(10,11),(14,11)
  // Doors: (9,10),(5,6),(7,2)   Exit: (15,1)
  const level3 = {
    cols: 17,
    rows: 13,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1 — exit at (15,1)
      W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,   // row 2 — door at (7,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,W,W,_,W,W,W,_,W,W,W,_,W,_,W,   // row 4
      W,_,W,_,_,_,_,_,W,_,_,_,W,_,W,_,W,   // row 5
      W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,   // row 6 — door at (5,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,W,W,_,W,W,W,_,W,W,W,_,W,_,W,   // row 8
      W,_,W,_,_,_,W,_,W,_,_,_,W,_,W,_,W,   // row 9
      W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,   // row 10 — door at (9,10)
      W,_,_,_,K,_,_,_,_,_,K,_,_,_,K,_,W,   // row 11 — keys at (4,11),(10,11),(14,11)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 12
    ],
    playerStart: { col: 1, row: 11 },
    enemies: [
      // Top zone sweeper (fast)
      {
        patrol: [
          { col: 1, row: 1 },
          { col: 14, row: 1 },
        ],
        speed: 2.4,
        visionRange: 185,
        visionAngle: Math.PI / 3,
      },
      // Upper zone left guard
      {
        patrol: [
          { col: 1, row: 3 },
          { col: 4, row: 3 },
          { col: 4, row: 5 },
          { col: 1, row: 5 },
        ],
        speed: 2.0,
        visionRange: 168,
        visionAngle: Math.PI / 2.8,
      },
      // Upper zone right guard
      {
        patrol: [
          { col: 9, row: 3 },
          { col: 15, row: 3 },
          { col: 15, row: 5 },
          { col: 9, row: 5 },
        ],
        speed: 2.3,
        visionRange: 162,
        visionAngle: Math.PI / 2.5,
      },
      // Mid zone left guard
      {
        patrol: [
          { col: 1, row: 7 },
          { col: 4, row: 7 },
          { col: 4, row: 9 },
          { col: 1, row: 9 },
        ],
        speed: 1.9,
        visionRange: 170,
        visionAngle: Math.PI / 3,
      },
      // Mid zone right guard (faster)
      {
        patrol: [
          { col: 9, row: 7 },
          { col: 15, row: 7 },
          { col: 15, row: 9 },
          { col: 9, row: 9 },
        ],
        speed: 2.6,
        visionRange: 155,
        visionAngle: Math.PI / 2.5,
      },
      // Bottom zone key guardian
      {
        patrol: [
          { col: 4, row: 11 },
          { col: 14, row: 11 },
        ],
        speed: 2.0,
        visionRange: 165,
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
