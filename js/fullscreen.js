// ── fullscreen.js ────────────────────────────────────────────
// Mobile-friendly fullscreen support.
// Provides enterFullscreen / exitFullscreen / toggleFullscreen helpers,
// handles fullscreenchange / fullscreenerror events, and falls back to a
// CSS pseudo-fullscreen layout when the Fullscreen API is unavailable.

const Fullscreen = (function () {
  'use strict';

  const CONTAINER_ID  = 'game-container';
  const FS_CLASS      = 'is-fullscreen';
  const PSEUDO_CLASS  = 'pseudo-fullscreen';
  const TOAST_ID      = 'fs-toast';

  // Cached natural (pre-scale) dimensions of the game container.
  // Populated on first _applyScale() call and cleared when fullscreen exits.
  let _natW = 0;
  let _natH = 0;

  // ── Helpers ─────────────────────────────────────────────────

  function _container() {
    return document.getElementById(CONTAINER_ID);
  }

  // True when a real fullscreen session is active (any vendor prefix).
  function _isRealFullscreen() {
    return !!(document.fullscreenElement        ||
              document.webkitFullscreenElement  ||
              document.mozFullScreenElement     ||
              document.msFullscreenElement);
  }

  // True when pseudo-fullscreen (CSS fallback) is active.
  function _isPseudo() {
    return document.body.classList.contains(PSEUDO_CLASS);
  }

  // ── Scale computation ────────────────────────────────────────
  // Scales the game container so it fills as much of the viewport as
  // possible while keeping the aspect ratio intact.

  function _applyScale() {
    const el = _container();
    if (!el) return;

    // Measure natural size on the first call (reset any previous transform).
    if (!_natW || !_natH) {
      const saved = el.style.transform;
      el.style.transform = 'none';
      _natW = el.offsetWidth;
      _natH = el.offsetHeight;
      el.style.transform = saved;
    }

    if (!_natW || !_natH) return;

    const scale = Math.min(window.innerWidth / _natW, window.innerHeight / _natH);
    el.style.transform       = 'scale(' + scale + ')';
    el.style.transformOrigin = 'center center';
  }

  function _clearScale() {
    const el = _container();
    if (!el) return;
    el.style.transform       = '';
    el.style.transformOrigin = '';
    // Reset cache so the next fullscreen session re-measures.
    _natW = 0;
    _natH = 0;
  }

  // ── Toast notification ───────────────────────────────────────

  function _showToast(msg) {
    let toast = document.getElementById(TOAST_ID);
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id        = TOAST_ID;
    toast.className = 'fs-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('fs-toast-hide');
      setTimeout(function () { toast.remove(); }, 500);
    }, 3500);
  }

  // ── Button state sync ────────────────────────────────────────

  function _updateButtons() {
    const active = isActive();
    document.querySelectorAll('.fullscreen-btn').forEach(function (btn) {
      btn.textContent = active ? '⊡' : '⛶';
      btn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
      btn.classList.toggle('fullscreen-active', active);
      // Update longer labels in the start-menu button
      if (btn.dataset.fslabel) {
        btn.textContent = active ? '⊡  EXIT FULLSCREEN' : '⛶  FULLSCREEN';
      }
    });
  }

  // ── Pseudo-fullscreen (CSS fallback) ─────────────────────────

  function _enterPseudo() {
    document.body.classList.add(PSEUDO_CLASS);
    _applyScale();
    window.addEventListener('resize', _applyScale);
    _updateButtons();
  }

  function _exitPseudo() {
    document.body.classList.remove(PSEUDO_CLASS);
    _clearScale();
    window.removeEventListener('resize', _applyScale);
    _updateButtons();
  }

  // ── Fullscreen API event handlers ────────────────────────────

  function _onFullscreenChange() {
    if (_isRealFullscreen()) {
      document.body.classList.add(FS_CLASS);
      _applyScale();
      window.addEventListener('resize', _applyScale);
    } else {
      document.body.classList.remove(FS_CLASS);
      _clearScale();
      window.removeEventListener('resize', _applyScale);
    }
    _updateButtons();
  }

  function _onFullscreenError() {
    // Real fullscreen failed — fall back to the CSS pseudo-fullscreen layout.
    _enterPseudo();
    _showToast('⚠ Fullscreen not supported on this device — using mobile fit mode');
  }

  // ── Public API ───────────────────────────────────────────────

  /** Returns true if the Fullscreen API is available in this browser. */
  function isSupported() {
    return !!(document.fullscreenEnabled        ||
              document.webkitFullscreenEnabled  ||
              document.mozFullScreenEnabled     ||
              document.msFullscreenEnabled);
  }

  /** Returns true when either real or pseudo fullscreen is active. */
  function isActive() {
    return _isRealFullscreen() || _isPseudo();
  }

  /** Request real fullscreen on the document element, falling back to
   *  pseudo-fullscreen if the API is unavailable or returns an error. */
  function enterFullscreen() {
    if (isActive()) return;

    const el  = document.documentElement;
    const req = el.requestFullscreen        ||
                el.webkitRequestFullscreen  ||
                el.mozRequestFullScreen     ||
                el.msRequestFullscreen;

    if (req) {
      Promise.resolve(req.call(el)).catch(_onFullscreenError);
    } else {
      _enterPseudo();
      _showToast('⚠ Fullscreen not supported on this device — using mobile fit mode');
    }
  }

  /** Exit real fullscreen or pseudo-fullscreen, whichever is active. */
  function exitFullscreen() {
    if (_isRealFullscreen()) {
      const exit = document.exitFullscreen        ||
                   document.webkitExitFullscreen  ||
                   document.mozCancelFullScreen   ||
                   document.msExitFullscreen;
      if (exit) exit.call(document);
    }
    if (_isPseudo()) {
      _exitPseudo();
    }
  }

  /** Toggle between fullscreen-on and fullscreen-off. */
  function toggleFullscreen() {
    if (isActive()) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }

  // ── Event listeners ──────────────────────────────────────────

  ['fullscreenchange', 'webkitfullscreenchange',
   'mozfullscreenchange', 'MSFullscreenChange'].forEach(function (ev) {
    document.addEventListener(ev, _onFullscreenChange);
  });

  ['fullscreenerror', 'webkitfullscreenerror'].forEach(function (ev) {
    document.addEventListener(ev, _onFullscreenError);
  });

  // Re-apply scale when the window is resized while fullscreen is active
  // (handled per-mode inside _enterPseudo / _onFullscreenChange).

  return {
    isSupported:    isSupported,
    isActive:       isActive,
    enter:          enterFullscreen,
    exit:           exitFullscreen,
    toggle:         toggleFullscreen,
  };
})();
