// ── input.js ────────────────────────────────────────────────
// Centralised keyboard input handler.

const Input = (() => {
  const _keys = {};
  const _justPressed = {};
  const _justReleased = {};

  function _onKeyDown(e) {
    if (!_keys[e.code]) {
      _justPressed[e.code] = true;
    }
    _keys[e.code] = true;
    // Prevent arrow / space scroll
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }
  }

  function _onKeyUp(e) {
    _keys[e.code] = false;
    _justReleased[e.code] = true;
  }

  function init() {
    window.addEventListener('keydown', _onKeyDown);
    window.addEventListener('keyup', _onKeyUp);
  }

  function flush() {
    // Call once per frame after processing
    for (const k in _justPressed) delete _justPressed[k];
    for (const k in _justReleased) delete _justReleased[k];
  }

  function isDown(code) {
    return !!_keys[code];
  }

  function isPressed(code) {
    return !!_justPressed[code];
  }

  function isReleased(code) {
    return !!_justReleased[code];
  }

  // Returns { dx, dy } from WASD / Arrow keys for this frame
  function getMoveDelta() {
    const up    = isPressed('ArrowUp')    || isPressed('KeyW');
    const down  = isPressed('ArrowDown')  || isPressed('KeyS');
    const left  = isPressed('ArrowLeft')  || isPressed('KeyA');
    const right = isPressed('ArrowRight') || isPressed('KeyD');
    let dx = 0, dy = 0;
    if (left)  dx -= 1;
    if (right) dx += 1;
    if (up)    dy -= 1;
    if (down)  dy += 1;
    // Diagonal not allowed on grid
    if (dx !== 0 && dy !== 0) { dy = 0; }
    return { dx, dy };
  }

  return { init, flush, isDown, isPressed, isReleased, getMoveDelta };
})();
