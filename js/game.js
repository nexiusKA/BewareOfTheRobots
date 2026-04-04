// ── game.js ─────────────────────────────────────────────────
// Core game loop, state machine, level management.

const Game = (() => {

  // ── State machine ────────────────────────────────────────
  const STATE = {
    INTRO:    'intro',
    PLAYING:  'playing',
    FAIL:     'fail',
    WIN:      'win',
    GAMEOVER: 'gameover', // all levels beaten
  };

  let _state = STATE.INTRO;
  let _currentLevel = 0;  // 0-indexed

  // ── Canvas / context ─────────────────────────────────────
  let _canvas = null;
  let _ctx    = null;

  // ── Timing ───────────────────────────────────────────────
  let _lastTime = 0;
  let _raf = null;

  // ── Near-detection slow-mo ───────────────────────────────
  const SLOWMO_THRESHOLD = 0.55;
  const SLOWMO_MIN = 0.28;
  let _timeScale = 1.0;
  let _targetTimeScale = 1.0;

  // ── Camera offset (center map in canvas) ─────────────────
  let _camX = 0;
  let _camY = 0;
  let _HUD_HEIGHT = 38;

  // ── Fail flash ───────────────────────────────────────────
  let _failFlash = 0;

  // ── Camera shake ─────────────────────────────────────────
  const SHAKE_DURATION = 0.55;
  const SHAKE_AMP      = 9;
  let _shakeDur = 0;
  let _shakeX   = 0;
  let _shakeY   = 0;

  // ── Cached threat level (for rendering) ──────────────────
  let _threat = 0;

  // ── Grace period after level start (prevents instant detection) ─
  const GRACE_DURATION = 1.5; // seconds
  let _graceTimer = 0;

  // ── Debug mode (# key) ───────────────────────────────────
  let _debugMode = false;

  function init(canvas) {
    _canvas = canvas;
    _ctx    = canvas.getContext('2d');
    Input.init();
    _loadLevel(_currentLevel);
    UI.showStart(Levels.count(), _onStart);
  }

  function _onStart() {
    UI.hide();
    _startLevel(_currentLevel);
  }

  function _loadLevel(index) {
    const def = Levels.get(index);
    if (!def) return false;

    // Resize canvas
    const mapW = def.cols * Tilemap.TILE_SIZE;
    const mapH = def.rows * Tilemap.TILE_SIZE;
    _canvas.width  = mapW;
    _canvas.height = mapH + _HUD_HEIGHT;

    // Camera — map fills canvas exactly, offset by HUD
    _camX = 0;
    _camY = _HUD_HEIGHT;

    // Init subsystems
    Tilemap.init(def.cols, def.rows, def.map);
    Player.init(def.playerStart.col, def.playerStart.row, def.startBombs || 0);
    EnemyManager.init(def.enemies);
    BombManager.init();

    UI.setHUD(index + 1, Levels.count(), Player.getKeys(), Player.getBombAmmo());

    return true;
  }

  function _startLevel(index) {
    _currentLevel = index;
    _loadLevel(index);
    _state = STATE.PLAYING;
    _timeScale = 1.0;
    _targetTimeScale = 1.0;
    _failFlash = 0;
    _shakeDur = 0;
    _shakeX = 0;
    _shakeY = 0;
    _threat = 0;
    _graceTimer = GRACE_DURATION;
  }

  function _onKeyCollect() {
    UI.setHUD(_currentLevel + 1, Levels.count(), Player.getKeys(), Player.getBombAmmo());
    UI.flashKeyCollect();
  }

  // ── Bomb placement flash (brief screen flash on placement) ─
  let _bombPlaceFlash = 0;

  function _onAmmoCollect() {
    UI.setHUD(_currentLevel + 1, Levels.count(), Player.getKeys(), Player.getBombAmmo());
    UI.flashAmmoCollect();
  }

  function _onDoorOpen() {
    // Could add door-open sound here
  }

  function _onExit() {
    _state = STATE.WIN;
    const nextIndex = _currentLevel + 1;
    if (nextIndex >= Levels.count()) {
      UI.showVictory(() => {
        UI.hide();
        _currentLevel = 0;
        _startLevel(0);
      });
    } else {
      UI.showLevelComplete(_currentLevel + 1, Levels.count(), () => {
        UI.hide();
        _startLevel(nextIndex);
      });
    }
  }

  function _onDetected() {
    if (_state !== STATE.PLAYING) return;
    _state = STATE.FAIL;
    _failFlash = 0.7;
    _shakeDur = SHAKE_DURATION;
    UI.showGameOver(() => {
      UI.hide();
      _startLevel(_currentLevel);
    });
  }

  // ── Main loop ────────────────────────────────────────────
  function start() {
    _lastTime = performance.now();
    _raf = requestAnimationFrame(_loop);
  }

  function _loop(timestamp) {
    const rawDt = Math.min((timestamp - _lastTime) / 1000, 0.05);
    _lastTime = timestamp;

    // Apply time scale (slow-mo)
    const dt = rawDt * _timeScale;

    _update(rawDt, dt);
    _render();

    Input.flush();
    _raf = requestAnimationFrame(_loop);
  }

  function _update(rawDt, dt) {
    // Toggle debug mode
    if (Input.isPressedKey('#')) {
      _debugMode = !_debugMode;
    }

    // Info overlay toggle — works from any game state
    if (Input.isPressed('KeyI')) {
      if (UI.isInfoVisible()) UI.hideInfo();
      else UI.showInfo();
    }
    if (Input.isPressed('Escape') && UI.isInfoVisible()) {
      UI.hideInfo();
    }

    // While info overlay is open, pause all game logic
    if (UI.isInfoVisible()) return;

    // Global restart shortcut
    if (Input.isPressed('KeyR')) {
      if (_state !== STATE.INTRO) {
        _startLevel(_currentLevel);
        UI.hide();
        return;
      }
    }

    if (_state !== STATE.PLAYING) {
      // Still update shake even after detection so it feels dramatic
      if (_shakeDur > 0) {
        _shakeDur -= rawDt;
        const amp = SHAKE_AMP * (_shakeDur / SHAKE_DURATION);
        _shakeX = (Math.random() * 2 - 1) * amp;
        _shakeY = (Math.random() * 2 - 1) * amp;
      } else {
        _shakeDur = 0;
        _shakeX = 0;
        _shakeY = 0;
      }
      return;
    }

    // Tilemap animation
    Tilemap.update(dt);

    // Player input & movement
    const { dx, dy } = Input.getMoveDelta();
    if (dx !== 0 || dy !== 0) {
      Player.tryMove(dx, dy, _onKeyCollect, _onDoorOpen, null);
    }

    // Bomb placement — Space key
    if (Input.isPressed('Space') && Player.getBombAmmo() > 0) {
      Player.useBomb();
      BombManager.placeBomb(Player.getPx(), Player.getPy());
      _bombPlaceFlash = 0.12;
      UI.setHUD(_currentLevel + 1, Levels.count(), Player.getKeys(), Player.getBombAmmo());
    }

    Player.update(dt, _onKeyCollect, _onExit, _onAmmoCollect);

    // Bombs
    BombManager.update(dt);

    // Enemies
    EnemyManager.update(dt, Player.getPx(), Player.getPy());

    // Grace period: suppress detection for the first seconds of a level
    if (_graceTimer > 0) _graceTimer -= rawDt;

    if (EnemyManager.wasDetected() && !_debugMode && _graceTimer <= 0) {
      _onDetected();
      return;
    }

    // Near-detection slow-mo
    _threat = EnemyManager.getNearAlert(Player.getPx(), Player.getPy());
    if (_threat > SLOWMO_THRESHOLD) {
      _targetTimeScale = Utils.lerp(1.0, SLOWMO_MIN,
        (_threat - SLOWMO_THRESHOLD) / (1 - SLOWMO_THRESHOLD));
    } else {
      _targetTimeScale = 1.0;
    }
    _timeScale = Utils.lerp(_timeScale, _targetTimeScale, rawDt * 5);

    // Vignette + danger warning feedback
    UI.setVignette(_threat * 0.9);
    UI.setDanger(_threat);

    // Camera shake decay (runs on real time so shake feels physical)
    if (_shakeDur > 0) {
      _shakeDur -= rawDt;
      const amp = SHAKE_AMP * (_shakeDur / SHAKE_DURATION);
      _shakeX = (Math.random() * 2 - 1) * amp;
      _shakeY = (Math.random() * 2 - 1) * amp;
    } else {
      _shakeDur = 0;
      _shakeX = 0;
      _shakeY = 0;
    }

    // Fail flash decay
    if (_failFlash > 0) _failFlash -= rawDt;
    if (_bombPlaceFlash > 0) _bombPlaceFlash -= rawDt;

    // HUD
    UI.update(rawDt);
    UI.setHUD(_currentLevel + 1, Levels.count(), Player.getKeys(), Player.getBombAmmo());
  }

  function _render() {
    const ctx = _ctx;
    const W = _canvas.width;
    const H = _canvas.height;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Map area (below HUD) — apply camera shake offset
    ctx.save();
    ctx.translate(_camX + _shakeX, _camY + _shakeY);
    Tilemap.draw(ctx);
    BombManager.draw(ctx);
    EnemyManager.draw(ctx);
    Player.draw(ctx);
    ctx.restore();

    // Fail flash overlay
    if (_failFlash > 0) {
      ctx.fillStyle = `rgba(255,30,30,${Utils.clamp(_failFlash * 0.8, 0, 0.55)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Bomb placement flash (brief white-green flash)
    if (_bombPlaceFlash > 0) {
      ctx.fillStyle = `rgba(0,255,136,${Utils.clamp(_bombPlaceFlash * 3.5, 0, 0.18)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Post-process
    UI.drawVignette(ctx, W, H);
    UI.drawDangerWarning(ctx, W, H);
    UI.drawScanlines(ctx, W, H);
    UI.drawHUD(ctx, W, H);

    // Debug mode indicator
    if (_debugMode) {
      ctx.save();
      ctx.font = 'bold 12px Courier New';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#00ff44';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00ff44';
      // Position below the HUD bar (HUD_HEIGHT = 38, vertically centred in lower half)
      ctx.fillText('[ DEBUG ]', 8, _HUD_HEIGHT / 2 + 14);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  return { init, start };
})();
