// ── utils.js ────────────────────────────────────────────────
// Shared math/geometry helpers used across modules.

const Utils = (() => {

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Angle from point a to point b (radians)
  function angleTo(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
  }

  // Shortest signed difference between two angles
  function angleDiff(a, b) {
    let d = ((b - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    return d;
  }

  // Check if angle `a` is within halfArc of angle `dir` (all radians)
  function angleInCone(a, dir, halfArc) {
    return Math.abs(angleDiff(dir, a)) <= halfArc;
  }

  // Euclidean distance
  function dist(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Distance squared (cheaper comparison)
  function dist2(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return dx * dx + dy * dy;
  }

  // Convert grid coords to pixel center
  function gridToPixel(col, row, tileSize) {
    return {
      x: col * tileSize + tileSize / 2,
      y: row * tileSize + tileSize / 2
    };
  }

  // Convert pixel position to grid cell
  function pixelToGrid(x, y, tileSize) {
    return {
      col: Math.floor(x / tileSize),
      row: Math.floor(y / tileSize)
    };
  }

  // RGBA helper
  function rgba(r, g, b, a) {
    return `rgba(${r},${g},${b},${a})`;
  }

  // Hex color with alpha (alpha 0-1)
  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // Random integer in [min, max)
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  return {
    clamp, lerp, angleTo, angleDiff, angleInCone,
    dist, dist2, gridToPixel, pixelToGrid, rgba, hexA, randInt
  };
})();
