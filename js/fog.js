// ── fog.js ──────────────────────────────────────────────────
// Fog-of-war system.  When enabled, only tiles within the player's
// current vision radius are visible.  Previously visited tiles are
// NOT remembered – the player must keep track of the map themselves.

const FogManager = (() => {

  const VISION_RADIUS = 5; // tiles visible around the player at any moment

  let _enabled    = true;
  let _playerCol  = 0;
  let _playerRow  = 0;
  let _cols       = 0;
  let _rows       = 0;

  // ── Public API ──────────────────────────────────────────

  // Call once per level load.
  function init(cols, rows, playerCol, playerRow) {
    _cols      = cols;
    _rows      = rows;
    _playerCol = playerCol;
    _playerRow = playerRow;
  }

  // Call after the player moves to a new tile.
  function reveal(col, row) {
    _playerCol = col;
    _playerRow = row;
  }

  // Toggle fog mode on / off.
  function toggle() { _enabled = !_enabled; }

  function isEnabled() { return _enabled; }

  // Returns true if the tile is currently within the player's vision.
  function isVisible(col, row) {
    if (!_enabled) return true;
    if (col < 0 || row < 0 || col >= _cols || row >= _rows) return false;
    const dc = col - _playerCol;
    const dr = row - _playerRow;
    return dc * dc + dr * dr <= VISION_RADIUS * VISION_RADIUS;
  }

  // Kept for backwards compatibility.
  function isExplored(col, row) { return isVisible(col, row); }

  // Draw dark overlay on tiles outside the player's current vision.
  // Must be called inside the world-space transform (after ctx.translate
  // to camera position).
  function draw(ctx) {
    if (!_enabled) return;
    const TS = Tilemap.TILE_SIZE;
    const r2 = VISION_RADIUS * VISION_RADIUS;
    ctx.fillStyle = 'rgba(0,0,0,0.93)';
    for (let r = 0; r < _rows; r++) {
      for (let c = 0; c < _cols; c++) {
        const dc = c - _playerCol;
        const dr = r - _playerRow;
        if (dc * dc + dr * dr > r2) {
          ctx.fillRect(c * TS, r * TS, TS, TS);
        }
      }
    }
  }

  return { init, reveal, toggle, isEnabled, isVisible, isExplored, draw };
})();
