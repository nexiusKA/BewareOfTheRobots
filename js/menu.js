// ── menu.js ─────────────────────────────────────────────────
// Compact start menu — mobile-optimised card, separate from
// in-game overlay logic.  Toggle visibility instead of re-creating DOM.

const Menu = (() => {

  const _el          = document.getElementById('start-menu');
  const _playBtn     = document.getElementById('start-menu-play-btn');
  const _continueBtn = document.getElementById('start-menu-continue-btn');
  const _soundBtn    = document.getElementById('start-menu-sound-btn');
  const _buildEl     = document.getElementById('start-menu-build');

  // Callback stored at show() time; onclick is wired once during init.
  let _onStartCallback = null;

  // Populate build info (version.js must load before menu.js)
  if (_buildEl && typeof BUILD_INFO !== 'undefined') {
    const run    = BUILD_INFO.run    || '—';
    const sha    = (BUILD_INFO.sha   || '').slice(0, 7) || '—';
    const date   = BUILD_INFO.date   || '';
    _buildEl.textContent = 'v0.' + run + '  ·  ' + sha + (date ? '  ·  ' + date : '');
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

  // ── Saved progress helper ────────────────────────────────
  function _getSaved() {
    try { return JSON.parse(localStorage.getItem('botr_save')) || {}; }
    catch (e) { return {}; }
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
    let _timeoutId = null;

    function _finish() {
      if (_done) return;
      _done = true;
      clearTimeout(_timeoutId);
      _el.classList.add('hidden');
      _el.classList.remove('menu-fading-out');
      if (callback) callback();
    }

    _el.addEventListener('animationend', _finish, { once: true });
    // Fallback: if animationend never fires (animation disabled/skipped), proceed.
    _timeoutId = setTimeout(_finish, 500);
  }

  // ── Play button — wired once at init time ─────────────────
  if (_playBtn) {
    _playBtn.addEventListener('click', function () {
      if (!_onStartCallback) return;
      // Prevent double-tap while fade is in progress
      _playBtn.disabled = true;
      Sound.tap();
      _fadeOutAndRun(_onStartCallback);
    });
  }

  // ── Public API ───────────────────────────────────────────

  function show(onStart, onContinue) {
    _onStartCallback = onStart;
    if (_playBtn) _playBtn.disabled = false;
    _el.classList.remove('hidden', 'menu-fading-out');
    _syncSoundBtn();

    // Show Continue button only if there is a saved mid-game level
    const saved = _getSaved();
    if (_continueBtn) {
      if (saved.level > 0 && typeof onContinue === 'function') {
        _continueBtn.classList.remove('hidden');
        _continueBtn.textContent = '▶  CONTINUE  SECTOR ' + (saved.level + 1);
        _continueBtn.disabled = false;
        _continueBtn.onclick = function () {
          _continueBtn.disabled = true;
          Sound.tap();
          _fadeOutAndRun(function () { onContinue(saved.level); });
        };
      } else {
        _continueBtn.classList.add('hidden');
      }
    }
  }

  function hide() {
    _el.classList.add('hidden');
    _el.classList.remove('menu-fading-out');
  }

  return { show, hide };
})();

