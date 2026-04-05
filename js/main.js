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

  // On touch/mobile devices automatically activate pseudo-fullscreen so the
  // game fills the viewport rather than showing large empty margins.
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    Fullscreen.enterPseudo();
  }

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

  // Action button — single press only (no hold-repeat; one action per tap).
  // Pass an optional keyChar to also fire pressVirtualKey (for actions that
  // use Input.isPressedKey() instead of Input.isPressed(), e.g. debug '#').
  function _setupActionButton(id, code, keyChar) {
    const btn = document.getElementById(id);
    if (!btn) return;
    function onPress(e) {
      e.preventDefault();
      if (code)    Input.pressVirtual(code);
      if (keyChar) Input.pressVirtualKey(keyChar);
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
  _setupActionButton('dpad-bomb',    'Space');
  _setupActionButton('dpad-info',    'KeyI');
  _setupActionButton('dpad-restart', 'KeyR');
  _setupActionButton('dpad-ghost',   'KeyG');
  _setupActionButton('dpad-fog',     'KeyF');
  _setupActionButton('dpad-debug',   null, '#');

  // ── Fullscreen wiring ──────────────────────────────────────
  // Both the start-menu button and the in-game dpad button call
  // Fullscreen.toggle() directly from a user-gesture handler so the
  // browser allows the fullscreen request.
  (function () {
    const menuBtn = document.getElementById('start-menu-fs-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function (e) {
        e.preventDefault();
        Fullscreen.toggle();
      });
    }

    // Dpad fullscreen button uses pointerdown (consistent with other dpad
    // action buttons) so the user gesture is recognised on all mobile browsers.
    const dpadFsBtn = document.getElementById('dpad-fullscreen');
    if (dpadFsBtn) {
      function onDpadFsRelease() { dpadFsBtn.classList.remove('dpad-pressed'); }
      dpadFsBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        Fullscreen.toggle();
        dpadFsBtn.classList.add('dpad-pressed');
      });
      dpadFsBtn.addEventListener('pointerup',     onDpadFsRelease);
      dpadFsBtn.addEventListener('pointercancel', onDpadFsRelease);
      dpadFsBtn.addEventListener('pointerleave',  onDpadFsRelease);
    }
  })();

  // ── Mobile D-pad menu toggle ───────────────────────────────
  const _dpad = document.getElementById('dpad');
  const MOBILE_KEY = 'dpad_enabled';

  function _isMobileEnabled() {
    return localStorage.getItem(MOBILE_KEY) === '1';
  }

  function _syncMobileToggleBtns(enabled) {
    const label = enabled ? '📱 Mobile Controls: ON' : '📱 Mobile Controls: OFF';
    document.querySelectorAll('.mobile-toggle-btn').forEach(function (btn) {
      btn.textContent = label;
      btn.classList.toggle('mobile-toggle-active', enabled);
    });
    if (_dpad) {
      if (enabled) {
        _dpad.classList.add('dpad-active');
      } else {
        _dpad.classList.remove('dpad-active');
      }
    }
  }

  function _toggleMobile() {
    const next = !_isMobileEnabled();
    localStorage.setItem(MOBILE_KEY, next ? '1' : '0');
    _syncMobileToggleBtns(next);
  }

  // Apply saved preference on load
  _syncMobileToggleBtns(_isMobileEnabled());

  // Use event delegation so any current or future .mobile-toggle-btn is handled
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('mobile-toggle-btn')) {
      _toggleMobile();
    }
  });
})();
