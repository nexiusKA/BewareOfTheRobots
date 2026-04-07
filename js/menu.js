// ── menu.js ─────────────────────────────────────────────────
// Compact start menu — mobile-optimised card, separate from
// in-game overlay logic.  Toggle visibility instead of re-creating DOM.

const Menu = (() => {

  const _el              = document.getElementById('start-menu');
  const _playBtn         = document.getElementById('start-menu-play-btn');
  const _continueBtn     = document.getElementById('start-menu-continue-btn');
  const _soundBtn        = document.getElementById('start-menu-sound-btn');
  const _buildEl         = document.getElementById('start-menu-build');
  const _progressEl      = document.getElementById('start-menu-progress');
  const _achievementsBtn = document.getElementById('start-menu-achievements-btn');
  const _achOverlay      = document.getElementById('achievements-overlay');
  const _achGrid         = document.getElementById('achievements-grid');
  const _achCount        = document.getElementById('achievements-count');
  const _achCloseBtn     = document.getElementById('achievements-close-btn');

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

  // ── Achievements overlay ─────────────────────────────────
  function _buildAchievementsGrid() {
    if (!_achGrid) return;
    const all  = Achievements.getAll();
    const prog = Achievements.getProgress();

    if (_achCount) {
      _achCount.textContent = prog.unlocked + ' / ' + prog.total + ' UNLOCKED';
    }

    _achGrid.innerHTML = '';
    for (const a of all) {
      const card = document.createElement('div');
      card.className = 'ach-card ' + (a.unlocked ? 'ach-unlocked' : 'ach-locked');

      const iconEl = document.createElement('div');
      iconEl.className = 'ach-card-icon';
      iconEl.textContent = a.icon;

      const body = document.createElement('div');
      body.className = 'ach-card-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'ach-card-name';
      nameEl.textContent = a.name;

      const descEl = document.createElement('div');
      descEl.className = 'ach-card-desc';
      descEl.textContent = a.desc;

      body.appendChild(nameEl);
      body.appendChild(descEl);

      if (a.progress) {
        const prog = document.createElement('div');
        prog.className = 'ach-card-progress';
        const barBg = document.createElement('div');
        barBg.className = 'ach-progress-bar-bg';
        const barFill = document.createElement('div');
        barFill.className = 'ach-progress-bar-fill';
        const pct = a.unlocked ? 100 : Math.round((a.currentProgress / a.target) * 100);
        barFill.style.width = pct + '%';
        barBg.appendChild(barFill);
        const label = document.createElement('span');
        label.className = 'ach-progress-label';
        label.textContent = (a.unlocked ? a.target : (a.currentProgress || 0)) + '/' + a.target;
        prog.appendChild(barBg);
        prog.appendChild(label);
        body.appendChild(prog);
      }

      const badge = document.createElement('div');
      badge.className = 'ach-card-badge';
      badge.textContent = a.unlocked ? '✓ UNLOCKED' : 'LOCKED';
      body.appendChild(badge);

      card.appendChild(iconEl);
      card.appendChild(body);
      _achGrid.appendChild(card);
    }
  }

  function _openAchievements() {
    if (!_achOverlay) return;
    _buildAchievementsGrid();
    _achOverlay.classList.remove('hidden');
  }

  function _closeAchievements() {
    if (!_achOverlay) return;
    _achOverlay.classList.add('hidden');
  }

  if (_achievementsBtn) {
    _achievementsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      Sound.tap();
      _openAchievements();
    });
  }

  if (_achCloseBtn) {
    _achCloseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      Sound.tap();
      _closeAchievements();
    });
  }

  // ── Achievement progress badge in start menu ─────────────
  function _syncProgress() {
    if (!_progressEl) return;
    const prog = Achievements.getProgress();
    if (prog.total === 0) {
      _progressEl.classList.add('hidden');
      return;
    }
    _progressEl.classList.remove('hidden');
    _progressEl.textContent = '🏆  ' + prog.unlocked + ' / ' + prog.total + '  ACHIEVEMENTS';
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
    _syncProgress();

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
    _closeAchievements();
  }

  return { show, hide };
})();

