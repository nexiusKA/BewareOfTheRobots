// ── main.js ─────────────────────────────────────────────────
// Entry point: wire up canvas and kick off the game loop.

(function () {
  const canvas = document.getElementById('game-canvas');

  // Polyfill roundRect for older browsers
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + w, y,     x + w, y + h, r);
      this.arcTo(x + w, y + h, x,     y + h, r);
      this.arcTo(x,     y + h, x,     y,     r);
      this.arcTo(x,     y,     x + w, y,     r);
      this.closePath();
    };
  }

  Game.init(canvas);
  Game.start();

  // ── Mobile D-pad wiring ────────────────────────────────────
  const DPAD_INITIAL_DELAY = 280; // ms before repeat starts on hold
  const DPAD_REPEAT_DELAY  = 160; // ms between repeated moves while held

  function _setupDpadButton(id, code) {
    const btn = document.getElementById(id);
    if (!btn) return;
    let initialTimer = null;
    let repeatTimer  = null;

    function startRepeat() {
      repeatTimer = setInterval(function () {
        Input.pressVirtual(code);
      }, DPAD_REPEAT_DELAY);
    }

    function onPress(e) {
      e.preventDefault();
      Input.pressVirtual(code);
      btn.classList.add('dpad-pressed');
      initialTimer = setTimeout(startRepeat, DPAD_INITIAL_DELAY);
    }

    function onRelease() {
      btn.classList.remove('dpad-pressed');
      clearTimeout(initialTimer);
      clearInterval(repeatTimer);
      initialTimer = null;
      repeatTimer  = null;
    }

    btn.addEventListener('pointerdown',   onPress);
    btn.addEventListener('pointerup',     onRelease);
    btn.addEventListener('pointercancel', onRelease);
    btn.addEventListener('pointerleave',  onRelease);
  }

  _setupDpadButton('dpad-up',    'ArrowUp');
  _setupDpadButton('dpad-left',  'ArrowLeft');
  _setupDpadButton('dpad-right', 'ArrowRight');
  _setupDpadButton('dpad-down',  'ArrowDown');

  // Bomb button — single press only (no hold-repeat; one bomb per tap)
  function _setupActionButton(id, code) {
    const btn = document.getElementById(id);
    if (!btn) return;
    function onPress(e) {
      e.preventDefault();
      Input.pressVirtual(code);
      btn.classList.add('dpad-pressed');
    }
    function onRelease() {
      btn.classList.remove('dpad-pressed');
    }
    btn.addEventListener('pointerdown',   onPress);
    btn.addEventListener('pointerup',     onRelease);
    btn.addEventListener('pointercancel', onRelease);
    btn.addEventListener('pointerleave',  onRelease);
  }
  _setupActionButton('dpad-bomb', 'Space');
})();
