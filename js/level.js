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
  const A = 6; // ammo pickup (+2 bombs)

  /*
   * Level descriptor shape:
   * {
   *   cols, rows,
   *   startBombs: number,   // bombs given at level start
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
    startBombs: 3,
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
      W,_,_,K,_,_,_,_,_,_,_,_,_,_,A,_,W,   // row 9  — key at (3,9); ammo at (14,9); player at (1,9)
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
    startBombs: 3,
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
      W,_,_,K,_,_,_,_,_,_,_,_,K,_,_,A,_,_,W,   // row 11 — keys at (3,11),(12,11); ammo at (15,11); player at (1,11)
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
    startBombs: 2,
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
      W,_,_,K,_,_,_,_,_,_,K,_,_,_,_,_,K,_,A,_,W,   // row 13 — keys at (3,13),(10,13),(16,13); ammo at (18,13); player at (1,13)
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
      // Lower mid scanner — first scanner unit introduced here
      {
        type: 'scanner',
        patrol: [
          { col: 19, row: 9 },
          { col: 1, row: 9 },
        ],
        speed: 1.0,
        visionRange: 135,
        visionAngle: Math.PI / 2,
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

  // ── Level 4 (23×17) — 2 keys, 2 doors ─────────────────────
  // Player: (1,15)  Keys: (3,15),(12,15)  Ammo: (18,15)
  // Doors: (12,2),(9,6)  Exit: (21,1)
  const level4 = {
    cols: 23,
    rows: 17,
    startBombs: 2,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1  — exit at (21,1)
      W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,   // row 2  — door at (12,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,   // row 4
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 5
      W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 6  — door at (9,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,   // row 8
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 9
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 10
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 11
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,   // row 12
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 13
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 14
      W,_,_,K,_,_,_,_,_,_,_,_,K,_,_,_,_,_,A,_,_,_,W,   // row 15 — keys (3,15)(12,15); ammo (18,15); player (1,15)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 16
    ],
    playerStart: { col: 1, row: 15 },
    enemies: [
      {
        patrol: [{ col: 1, row: 1 }, { col: 20, row: 1 }],
        speed: 2.5,
        visionRange: 195,
        visionAngle: Math.PI / 3,
      },
      {
        patrol: [{ col: 1, row: 3 }, { col: 21, row: 3 }, { col: 21, row: 5 }, { col: 1, row: 5 }],
        speed: 2.2,
        visionRange: 185,
        visionAngle: Math.PI / 2.8,
      },
      // Scanner guarding the middle zone
      {
        type: 'scanner',
        patrol: [{ col: 21, row: 9 }, { col: 1, row: 9 }],
        speed: 1.0,
        visionRange: 140,
        visionAngle: Math.PI / 2,
      },
      {
        patrol: [{ col: 21, row: 15 }, { col: 5, row: 15 }],
        speed: 2.6,
        visionRange: 175,
        visionAngle: Math.PI / 2.8,
      },
    ],
  };

  // ── Level 5 (23×17) — 3 keys, 3 doors ─────────────────────
  // Player: (1,15)  Keys: (3,15),(10,15),(18,15)  Ammo: (16,15)
  // Doors: (11,2),(7,6),(15,10)  Exit: (21,1)
  const level5 = {
    cols: 23,
    rows: 17,
    startBombs: 2,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1  — exit at (21,1)
      W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,   // row 2  — door at (11,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,   // row 4
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 5
      W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 6  — door at (7,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,   // row 8
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 9
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,   // row 10 — door at (15,10)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 11
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,   // row 12
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 13
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 14
      W,_,_,K,_,_,_,_,_,_,K,_,_,_,_,_,A,_,K,_,_,_,W,   // row 15 — keys (3,15)(10,15)(18,15); ammo (16,15); player (1,15)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 16
    ],
    playerStart: { col: 1, row: 15 },
    enemies: [
      // Top patrol
      {
        patrol: [{ col: 1, row: 1 }, { col: 20, row: 1 }],
        speed: 2.6,
        visionRange: 195,
        visionAngle: Math.PI / 3,
      },
      // Upper left patrol
      {
        patrol: [{ col: 1, row: 3 }, { col: 10, row: 3 }, { col: 10, row: 5 }, { col: 1, row: 5 }],
        speed: 2.4,
        visionRange: 180,
        visionAngle: Math.PI / 2.8,
      },
      // Upper right scanner
      {
        type: 'scanner',
        patrol: [{ col: 12, row: 3 }, { col: 21, row: 3 }, { col: 21, row: 5 }, { col: 12, row: 5 }],
        speed: 1.1,
        visionRange: 138,
        visionAngle: Math.PI / 2,
      },
      // Mid patrol
      {
        patrol: [{ col: 21, row: 7 }, { col: 1, row: 7 }],
        speed: 2.3,
        visionRange: 188,
        visionAngle: Math.PI / 3,
      },
      // Bottom scanner
      {
        type: 'scanner',
        patrol: [{ col: 21, row: 13 }, { col: 5, row: 13 }],
        speed: 1.0,
        visionRange: 135,
        visionAngle: Math.PI / 2,
      },
    ],
  };

  // ── Level 6 (25×19) — 3 keys, 3 doors ─────────────────────
  // Player: (1,17)  Keys: (3,17),(10,17),(19,17)  Ammo: (16,17)
  // Doors: (12,2),(8,6),(14,10)  Exit: (23,1)
  const level6 = {
    cols: 25,
    rows: 19,
    startBombs: 2,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1  — exit at (23,1)
      W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,   // row 2  — door at (12,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 4
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 5
      W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 6  — door at (8,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 8
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 9
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,   // row 10 — door at (14,10)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 11
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 12
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 13
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 14
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 15
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 16
      W,_,_,K,_,_,_,_,_,_,K,_,_,_,_,_,A,_,_,K,_,_,_,_,W,   // row 17 — keys (3,17)(10,17)(19,17); ammo (16,17); player (1,17)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 18
    ],
    playerStart: { col: 1, row: 17 },
    enemies: [
      // Top hunter — first hunter unit
      {
        type: 'hunter',
        patrol: [{ col: 1, row: 1 }, { col: 22, row: 1 }],
        speed: 3.2,
        visionRange: 240,
        visionAngle: Math.PI / 7,
      },
      {
        patrol: [{ col: 1, row: 3 }, { col: 11, row: 3 }, { col: 11, row: 5 }, { col: 1, row: 5 }],
        speed: 2.6,
        visionRange: 185,
        visionAngle: Math.PI / 2.8,
      },
      // Scanner in the upper-right zone
      {
        type: 'scanner',
        patrol: [{ col: 13, row: 3 }, { col: 23, row: 3 }, { col: 23, row: 5 }, { col: 13, row: 5 }],
        speed: 1.1,
        visionRange: 138,
        visionAngle: Math.PI / 2,
      },
      {
        patrol: [{ col: 23, row: 7 }, { col: 1, row: 7 }],
        speed: 2.5,
        visionRange: 190,
        visionAngle: Math.PI / 3,
      },
      {
        patrol: [{ col: 23, row: 11 }, { col: 1, row: 11 }],
        speed: 2.6,
        visionRange: 185,
        visionAngle: Math.PI / 3,
      },
      {
        patrol: [{ col: 23, row: 17 }, { col: 5, row: 17 }],
        speed: 2.9,
        visionRange: 178,
        visionAngle: Math.PI / 2.8,
      },
    ],
  };

  // ── Level 7 (25×19) — 3 keys, 3 doors, checkerboard ───────
  // Player: (1,17)  Keys: (3,17),(10,17),(19,17)  Ammo: (14,17)
  // Doors: (8,10),(11,6),(15,2)  Exit: (23,1)
  const level7 = {
    cols: 25,
    rows: 19,
    startBombs: 1,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1  — exit at (23,1)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,   // row 2  — door at (15,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 4 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 5
      W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 6  — door at (11,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 8 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 9
      W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 10 — door at (8,10)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 11
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 12
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 13
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 14 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 15
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 16
      W,_,_,K,_,_,_,_,_,_,K,_,_,_,A,_,_,_,_,K,_,_,_,_,W,   // row 17 — keys (3,17)(10,17)(19,17); ammo (14,17); player (1,17)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 18
    ],
    playerStart: { col: 1, row: 17 },
    enemies: [
      // Top hunter
      {
        type: 'hunter',
        patrol: [{ col: 1, row: 1 }, { col: 22, row: 1 }],
        speed: 3.2,
        visionRange: 248,
        visionAngle: Math.PI / 7,
      },
      {
        patrol: [{ col: 1, row: 3 }, { col: 23, row: 3 }],
        speed: 2.8,
        visionRange: 188,
        visionAngle: Math.PI / 3,
      },
      // Scanner sweeping a row
      {
        type: 'scanner',
        patrol: [{ col: 23, row: 5 }, { col: 1, row: 5 }],
        speed: 1.1,
        visionRange: 138,
        visionAngle: Math.PI / 2,
      },
      {
        patrol: [{ col: 23, row: 7 }, { col: 1, row: 7 }],
        speed: 2.7,
        visionRange: 192,
        visionAngle: Math.PI / 3,
      },
      // Second scanner
      {
        type: 'scanner',
        patrol: [{ col: 1, row: 9 }, { col: 23, row: 9 }],
        speed: 1.0,
        visionRange: 135,
        visionAngle: Math.PI / 2,
      },
      {
        patrol: [{ col: 23, row: 17 }, { col: 5, row: 17 }],
        speed: 3.2,
        visionRange: 180,
        visionAngle: Math.PI / 2.8,
      },
    ],
  };

  // ── Level 8 (25×21) — 4 keys, 4 doors ─────────────────────
  // Player: (1,19)  Keys: (3,19),(8,19),(14,19),(20,19)  Ammo: (17,19)
  // Doors: (10,2),(7,6),(16,10),(12,14)  Exit: (23,1)
  const level8 = {
    cols: 25,
    rows: 21,
    startBombs: 1,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1  — exit at (23,1)
      W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 2  — door at (10,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 4
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 5
      W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 6  — door at (7,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 8 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 9
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,   // row 10 — door at (16,10)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 11
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 12
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 13
      W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,   // row 14 — door at (12,14)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 15
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 16 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 17
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 18
      W,_,_,K,_,_,_,_,K,_,_,_,_,_,K,_,_,A,_,_,K,_,_,_,W,   // row 19 — keys (3,19)(8,19)(14,19)(20,19); ammo (17,19); player (1,19)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 20
    ],
    playerStart: { col: 1, row: 19 },
    enemies: [
      // Hunter at the top
      {
        type: 'hunter',
        patrol: [{ col: 1, row: 1 }, { col: 22, row: 1 }],
        speed: 3.5,
        visionRange: 252,
        visionAngle: Math.PI / 7,
      },
      {
        patrol: [{ col: 1, row: 3 }, { col: 23, row: 3 }],
        speed: 3.0,
        visionRange: 190,
        visionAngle: Math.PI / 3,
      },
      // Scanner
      {
        type: 'scanner',
        patrol: [{ col: 23, row: 5 }, { col: 1, row: 5 }],
        speed: 1.1,
        visionRange: 140,
        visionAngle: Math.PI / 2,
      },
      {
        patrol: [{ col: 1, row: 7 }, { col: 23, row: 7 }],
        speed: 2.8,
        visionRange: 192,
        visionAngle: Math.PI / 3,
      },
      // Second hunter in the mid zone
      {
        type: 'hunter',
        patrol: [{ col: 23, row: 9 }, { col: 1, row: 9 }],
        speed: 3.4,
        visionRange: 248,
        visionAngle: Math.PI / 7,
      },
      // Scanner
      {
        type: 'scanner',
        patrol: [{ col: 1, row: 11 }, { col: 23, row: 11 }],
        speed: 1.0,
        visionRange: 138,
        visionAngle: Math.PI / 2,
      },
      {
        patrol: [{ col: 23, row: 19 }, { col: 5, row: 19 }],
        speed: 3.5,
        visionRange: 182,
        visionAngle: Math.PI / 2.5,
      },
    ],
  };

  // ── Level 9 (25×21) — 4 keys, 4 doors, no ammo ────────────
  // Player: (1,19)  Keys: (3,19),(8,19),(16,19),(21,19)
  // Doors: (14,2),(9,6),(18,10),(6,14)  Exit: (23,1)
  const level9 = {
    cols: 25,
    rows: 21,
    startBombs: 1,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1  — exit at (23,1)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,   // row 2  — door at (14,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 4 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 5
      W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 6  — door at (9,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 8 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 9
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,   // row 10 — door at (18,10)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 11
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 12 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 13
      W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 14 — door at (6,14)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 15
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,_,W,   // row 16
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 17
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 18 (checkerboard)
      W,_,_,K,_,_,_,_,K,_,_,_,_,_,_,_,K,_,_,_,_,K,_,_,W,   // row 19 — keys (3,19)(8,19)(16,19)(21,19); player (1,19)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 20
    ],
    playerStart: { col: 1, row: 19 },
    enemies: [
      // Hunter at the top
      {
        type: 'hunter',
        patrol: [{ col: 1, row: 1 }, { col: 22, row: 1 }],
        speed: 3.8,
        visionRange: 256,
        visionAngle: Math.PI / 7,
      },
      {
        patrol: [{ col: 1, row: 3 }, { col: 23, row: 3 }],
        speed: 3.3,
        visionRange: 195,
        visionAngle: Math.PI / 2.8,
      },
      // Scanner
      {
        type: 'scanner',
        patrol: [{ col: 23, row: 5 }, { col: 1, row: 5 }],
        speed: 1.1,
        visionRange: 140,
        visionAngle: Math.PI / 2,
      },
      // Second hunter mid
      {
        type: 'hunter',
        patrol: [{ col: 1, row: 7 }, { col: 23, row: 7 }],
        speed: 3.6,
        visionRange: 252,
        visionAngle: Math.PI / 7,
      },
      {
        patrol: [{ col: 23, row: 9 }, { col: 1, row: 9 }],
        speed: 3.3,
        visionRange: 192,
        visionAngle: Math.PI / 2.8,
      },
      // Scanner
      {
        type: 'scanner',
        patrol: [{ col: 1, row: 11 }, { col: 23, row: 11 }],
        speed: 1.1,
        visionRange: 142,
        visionAngle: Math.PI / 2,
      },
      {
        patrol: [{ col: 23, row: 13 }, { col: 1, row: 13 }],
        speed: 3.6,
        visionRange: 185,
        visionAngle: Math.PI / 2.5,
      },
      {
        patrol: [{ col: 23, row: 19 }, { col: 5, row: 19 }],
        speed: 3.8,
        visionRange: 182,
        visionAngle: Math.PI / 2.5,
      },
    ],
  };

  // ── Level 10 (27×23) — 4 keys, 4 doors, max difficulty ────
  // Player: (1,21)  Keys: (3,21),(9,21),(16,21),(22,21)
  // Doors: (13,2),(8,6),(18,10),(11,14)  Exit: (25,1)
  const level10 = {
    cols: 27,
    rows: 23,
    startBombs: 1,
    map: [
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 0
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,E,W,   // row 1  — exit at (25,1)
      W,W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 2  — door at (13,2)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 3
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 4 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 5
      W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 6  — door at (8,6)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 7
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 8 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 9
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,   // row 10 — door at (18,10)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 11
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 12 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 13
      W,W,W,W,W,W,W,W,W,W,W,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 14 — door at (11,14)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 15
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,   // row 16
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 17
      W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,_,W,   // row 18 (checkerboard)
      W,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,W,   // row 19
      W,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,W,_,_,W,   // row 20
      W,_,_,K,_,_,_,_,_,K,_,_,_,_,_,_,K,_,_,_,_,_,K,_,_,_,W,   // row 21 — keys (3,21)(9,21)(16,21)(22,21); player (1,21)
      W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,   // row 22
    ],
    playerStart: { col: 1, row: 21 },
    enemies: [
      // Top hunter — elite speed
      {
        type: 'hunter',
        patrol: [{ col: 1, row: 1 }, { col: 24, row: 1 }],
        speed: 4.2,
        visionRange: 260,
        visionAngle: Math.PI / 7,
      },
      // Scanner row 3
      {
        type: 'scanner',
        patrol: [{ col: 1, row: 3 }, { col: 25, row: 3 }],
        speed: 1.2,
        visionRange: 145,
        visionAngle: Math.PI / 2,
      },
      // Second hunter
      {
        type: 'hunter',
        patrol: [{ col: 25, row: 5 }, { col: 1, row: 5 }],
        speed: 4.0,
        visionRange: 256,
        visionAngle: Math.PI / 7,
      },
      // Patrol
      {
        patrol: [{ col: 1, row: 7 }, { col: 25, row: 7 }],
        speed: 3.5,
        visionRange: 200,
        visionAngle: Math.PI / 3,
      },
      // Scanner row 9
      {
        type: 'scanner',
        patrol: [{ col: 25, row: 9 }, { col: 1, row: 9 }],
        speed: 1.2,
        visionRange: 145,
        visionAngle: Math.PI / 2,
      },
      // Third hunter
      {
        type: 'hunter',
        patrol: [{ col: 1, row: 11 }, { col: 25, row: 11 }],
        speed: 4.0,
        visionRange: 254,
        visionAngle: Math.PI / 7,
      },
      {
        patrol: [{ col: 25, row: 13 }, { col: 1, row: 13 }],
        speed: 3.9,
        visionRange: 190,
        visionAngle: Math.PI / 2.5,
      },
      // Scanner row 17
      {
        type: 'scanner',
        patrol: [{ col: 1, row: 17 }, { col: 25, row: 17 }],
        speed: 1.1,
        visionRange: 142,
        visionAngle: Math.PI / 2,
      },
      {
        patrol: [{ col: 25, row: 21 }, { col: 5, row: 21 }],
        speed: 4.0,
        visionRange: 185,
        visionAngle: Math.PI / 2.5,
      },
    ],
  };

  const _levels = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10];

  function get(index) {
    return _levels[index] || null;
  }

  function count() {
    return _levels.length;
  }

  return { get, count };
})();
