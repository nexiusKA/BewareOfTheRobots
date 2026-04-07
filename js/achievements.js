// ── achievements.js ─────────────────────────────────────────
// Achievement system — tracks per-level and cumulative stats,
// awards achievements, and shows toast notifications.

const Achievements = (() => {

  const _SAVE_KEY  = 'botr_achievements';
  const _STATS_KEY = 'botr_achievement_stats';

  // ── Definitions ──────────────────────────────────────────
  const DEFS = [
    {
      id: 'first_step',
      name: 'FIRST STEP',
      desc: 'Complete your first sector.',
      icon: '🚀',
    },
    {
      id: 'ghost',
      name: 'GHOST PROTOCOL',
      desc: 'Complete a sector without triggering any enemy detection.',
      icon: '👻',
    },
    {
      id: 'demolitionist',
      name: 'DEMOLITIONIST',
      desc: 'Destroy 3 or more enemies in a single sector.',
      icon: '💥',
    },
    {
      id: 'speed_run',
      name: 'SPEED RUN',
      desc: 'Complete a sector in under 90 seconds.',
      icon: '⚡',
    },
    {
      id: 'pacifist',
      name: 'PACIFIST',
      desc: 'Complete a sector without placing any bombs.',
      icon: '🕊️',
    },
    {
      id: 'agent',
      name: 'SECTOR AGENT',
      desc: 'Complete 5 sectors.',
      icon: '🔰',
      progress: true,
      target: 5,
      statKey: 'sectorsCompleted',
    },
    {
      id: 'shadow_ops',
      name: 'SHADOW OPS',
      desc: 'Complete 3 sectors as a ghost (no detection).',
      icon: '🌑',
      progress: true,
      target: 3,
      statKey: 'ghostSectors',
    },
    {
      id: 'elite',
      name: 'ELITE OPERATIVE',
      desc: 'Complete all 13 sectors. Mission accomplished.',
      icon: '⭐',
    },
    {
      id: 'bomb_squad',
      name: 'BOMB SQUAD',
      desc: 'Destroy 10 enemies total across all runs.',
      icon: '💣',
      progress: true,
      target: 10,
      statKey: 'totalEnemiesDestroyed',
    },
    {
      id: 'close_call',
      name: 'CLOSE CALL',
      desc: 'Have the alert meter above 80% and still complete the sector.',
      icon: '❤️',
    },
  ];

  // ── Toast queue ───────────────────────────────────────────
  let _toastQueue  = [];
  let _toastTimer  = 0;
  let _toastEl     = null;
  let _toastActive = false;

  // ── Per-level run stats ───────────────────────────────────
  // Reset at the start of every level (including retries).
  let _levelStats = { bombsPlaced: 0, maxAlert: 0, ghost: true };

  // ── localStorage helpers ──────────────────────────────────
  function _getUnlocked() {
    try { return JSON.parse(localStorage.getItem(_SAVE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function _saveUnlocked(data) {
    try { localStorage.setItem(_SAVE_KEY, JSON.stringify(data)); }
    catch (e) {}
  }

  function _getCumStats() {
    try { return JSON.parse(localStorage.getItem(_STATS_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function _saveCumStats(data) {
    try { localStorage.setItem(_STATS_KEY, JSON.stringify(data)); }
    catch (e) {}
  }

  // ── Public query helpers ──────────────────────────────────
  function isUnlocked(id) { return !!_getUnlocked()[id]; }

  function unlock(id) {
    const data = _getUnlocked();
    if (data[id]) return false;
    data[id] = Date.now();
    _saveUnlocked(data);
    return true;
  }

  // ── Per-level tracking ────────────────────────────────────
  // Called at the start of each level (including retries) to reset counters.
  function resetLevelStats() {
    _levelStats = { bombsPlaced: 0, maxAlert: 0, ghost: true };
  }

  // Call each time a bomb is placed by the player.
  function trackBombPlaced() {
    if (_levelStats) _levelStats.bombsPlaced++;
  }

  // Call every frame with the current global alert value.
  const _GHOST_THRESHOLD = 0.15;
  function trackMaxAlert(alert) {
    if (!_levelStats) return;
    if (alert > _levelStats.maxAlert) _levelStats.maxAlert = alert;
    if (alert > _GHOST_THRESHOLD)     _levelStats.ghost    = false;
  }

  // ── Level completion check ────────────────────────────────
  // Called from game.js _onExit() after the level is won.
  // levelIndex — 0-indexed level that was just completed.
  // levelTimer — seconds elapsed this run.
  const TOTAL_LEVELS = 13;

  function onLevelComplete(levelIndex, levelTimer) {
    // Count how many enemies were destroyed this level.
    const destroyed = EnemyManager.getEnemies()
      .filter(e => e.state === EnemyManager.STATE.DESTROYED).length;

    // Update cumulative stats.
    const stats = _getCumStats();
    stats.sectorsCompleted      = (stats.sectorsCompleted      || 0) + 1;
    stats.totalEnemiesDestroyed = (stats.totalEnemiesDestroyed || 0) + destroyed;
    if (_levelStats.ghost) stats.ghostSectors = (stats.ghostSectors || 0) + 1;
    _saveCumStats(stats);

    // Determine which achievements are newly eligible.
    const candidates = [];

    if (stats.sectorsCompleted >= 1)   candidates.push('first_step');
    if (_levelStats.ghost)             candidates.push('ghost');
    if (destroyed >= 3)                candidates.push('demolitionist');
    if (levelTimer > 0 && levelTimer <= 90) candidates.push('speed_run');
    if (_levelStats.bombsPlaced === 0) candidates.push('pacifist');
    if (stats.sectorsCompleted >= 5)   candidates.push('agent');
    if ((stats.ghostSectors || 0) >= 3) candidates.push('shadow_ops');
    if (levelIndex + 1 >= TOTAL_LEVELS) candidates.push('elite');
    if (stats.totalEnemiesDestroyed >= 10) candidates.push('bomb_squad');
    if (_levelStats.maxAlert >= 0.80)  candidates.push('close_call');

    for (const id of candidates) {
      if (unlock(id)) _toastQueue.push(id);
    }
  }

  // ── Toast update tick ─────────────────────────────────────
  // Call from the game loop every frame.
  function update(dt) {
    if (!_toastEl) _toastEl = document.getElementById('achievement-toast');
    if (!_toastEl) return;

    if (_toastActive) {
      _toastTimer -= dt;
      if (_toastTimer <= 0) {
        _toastActive = false;
        _toastEl.classList.add('ach-toast-hide');
        // After CSS transition, hide and try next
        setTimeout(_showNextToast, 450);
      }
    }
  }

  function _showNextToast() {
    if (_toastQueue.length === 0) return;
    if (_toastActive) return;
    const id  = _toastQueue.shift();
    const def = DEFS.find(d => d.id === id);
    if (!def || !_toastEl) return;

    const iconEl = document.getElementById('achievement-toast-icon');
    const nameEl = document.getElementById('achievement-toast-name');
    if (iconEl) iconEl.textContent = def.icon;
    if (nameEl) nameEl.textContent = def.name;

    _toastEl.classList.remove('hidden', 'ach-toast-hide');
    _toastEl.classList.add('ach-toast-show');
    _toastActive = true;
    _toastTimer  = 3.2; // seconds the toast stays visible

    Sound.tap();
  }

  // ── Data for UI ───────────────────────────────────────────
  function getAll() {
    const unlocked = _getUnlocked();
    const stats    = _getCumStats();
    return DEFS.map(d => ({
      ...d,
      unlocked:        !!unlocked[d.id],
      unlockedAt:      unlocked[d.id] || null,
      currentProgress: d.progress && d.target ? Math.min(stats[d.statKey] || 0, d.target) : null,
    }));
  }

  function getProgress() {
    const unlocked = _getUnlocked();
    const count    = DEFS.filter(d => !!unlocked[d.id]).length;
    return { unlocked: count, total: DEFS.length };
  }

  // For debug/reset purposes only.
  function resetAll() {
    try {
      localStorage.removeItem(_SAVE_KEY);
      localStorage.removeItem(_STATS_KEY);
    } catch (e) {}
  }

  return {
    resetLevelStats,
    trackBombPlaced,
    trackMaxAlert,
    onLevelComplete,
    update,
    getAll,
    getProgress,
    isUnlocked,
    unlock,
    resetAll,
  };
})();
