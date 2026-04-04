// ── fog.js ──────────────────────────────────────────────────
// Fog-of-war system.  When enabled, tiles the player has never
// visited are hidden under a dark overlay.  The initial explored
// area around the player start is roughly 10×10 tiles; it grows
// tile-by-tile as the player moves through the map.

const FogManager = (() => {

  const INITIAL_RADIUS = 7; // ≈14×14 starting visible area
  const MOVE_RADIUS    = 5; // tiles revealed around player after each step

  let _enabled  = false;
  let _explored = null;   // Uint8Array, flat row-major
  let _cols     = 0;
  let _rows     = 0;

  // ── Helpers ─────────────────────────────────────────────
  function _revealCircle(col, row, radius) {
    const r2 = radius * radius;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dc * dc + dr * dr <= r2) {
          const c = col + dc;
          const r = row + dr;
          if (c >= 0 && r >= 0 && c < _cols && r < _rows) {
            _explored[r * _cols + c] = 1;
          }
        }
      }
    }
  }

  // ── Public API ──────────────────────────────────────────

  // Call once per level load (always, so explored array is ready when toggled on).
  function init(cols, rows, playerCol, playerRow) {
    _cols     = cols;
    _rows     = rows;
    _explored = new Uint8Array(cols * rows);
    _revealCircle(playerCol, playerRow, INITIAL_RADIUS);
  }

  // Call after the player moves to a new tile.
  function reveal(col, row) {
    if (_explored) _revealCircle(col, row, MOVE_RADIUS);
  }

  // Toggle fog mode on / off.
  function toggle() { _enabled = !_enabled; }

  function isEnabled() { return _enabled; }

  // Returns true if the tile is visible (fog off OR tile has been explored).
  function isExplored(col, row) {
    if (!_enabled || !_explored) return true;
    if (col < 0 || row < 0 || col >= _cols || row >= _rows) return false;
    return _explored[row * _cols + col] === 1;
  }

  // Draw dark overlay on unexplored tiles.  Must be called inside the
  // world-space transform (after ctx.translate to camera position).
  function draw(ctx) {
    if (!_enabled || !_explored) return;
    const TS = Tilemap.TILE_SIZE;
    ctx.fillStyle = 'rgba(0,0,0,0.93)';
    for (let r = 0; r < _rows; r++) {
      for (let c = 0; c < _cols; c++) {
        if (!_explored[r * _cols + c]) {
          ctx.fillRect(c * TS, r * TS, TS, TS);
        }
      }
    }
  }

  return { init, reveal, toggle, isEnabled, isExplored, draw };
})();
