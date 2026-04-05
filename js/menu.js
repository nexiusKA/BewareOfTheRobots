// ── menu.js ─────────────────────────────────────────────────
// Compact start menu — mobile-optimised card, separate from
// in-game overlay logic.  Toggle visibility instead of re-creating DOM.

const Menu = (() => {

  const _el       = document.getElementById('start-menu');
  const _playBtn  = document.getElementById('start-menu-play-btn');
  const _soundBtn = document.getElementById('start-menu-sound-btn');
  const _buildEl  = document.getElementById('start-menu-build');

  // Populate build info (version.js must load before menu.js)
  if (_buildEl && typeof BUILD_INFO !== 'undefined') {
    _buildEl.textContent =
      'v0.' + BUILD_INFO.run + '  ·  ' + BUILD_INFO.sha.slice(0, 7) +
      '  ·  ' + BUILD_INFO.date;
  }

  // ── Sound toggle ─────────────────────────────────────────
  function _syncSoundBtn() {
    if (!_soundBtn) return;
    const muted = Sound.isMuted();
    _soundBtn.textContent = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
    _soundBtn.classList.toggle('menu-btn-muted', muted);
  }

  if (_soundBtn) {
    _soundBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      Sound.toggleMute();
      _syncSoundBtn();
    });
  }

  // ── Fade-out helper ──────────────────────────────────────
  // Plays the CSS fade-out, then runs callback.
  // Falls back instantly when prefers-reduced-motion is set.
  function _fadeOutAndRun(callback) {
    const reduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      _el.classList.add('hidden');
      if (callback) callback();
      return;
    }

    _el.classList.add('menu-fading-out');

    let _done = false;
    function _finish() {
      if (_done) return;
      _done = true;
      _el.classList.add('hidden');
      _el.classList.remove('menu-fading-out');
      if (callback) callback();
    }

    _el.addEventListener('animationend', _finish, { once: true });
    // Fallback: if the animationend never fires (e.g., animation skipped), proceed.
    setTimeout(_finish, 500);
  }

  // ── Public API ───────────────────────────────────────────

  function show(onStart) {
    _el.classList.remove('hidden', 'menu-fading-out');
    _syncSoundBtn();

    if (_playBtn) {
      _playBtn.onclick = function () {
        // Prevent double-tap
        _playBtn.disabled = true;
        _fadeOutAndRun(onStart);
      };
    }
  }

  function hide() {
    _el.classList.add('hidden');
    _el.classList.remove('menu-fading-out');
  }

  return { show, hide };
})();
