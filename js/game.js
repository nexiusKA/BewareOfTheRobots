// ── game.js ─────────────────────────────────────────────────
// Core game loop, state machine, level management.

const Game = (() => {

  // ── State machine ────────────────────────────────────────
  const STATE = {
    INTRO:    'intro',
    PLAYING:  'playing',
    PAUSED:   'paused',
    FAIL:     'fail',
    WIN:      'win',
    GAMEOVER: 'gameover', // all levels beaten
  };

  let _state = STATE.INTRO;
  let _currentLevel = 0;  // 0-indexed
  let _totalKeysCollected = 0; // keys picked up this level (resets on level load)

  // ── Pause ────────────────────────────────────────────────
  let _pausedPrevState = null;

  // ── Level timer ──────────────────────────────────────────
  let _levelTimer = 0; // elapsed seconds this level

  // ── Alert state tracking ─────────────────────────────────
  let _prevAlertCount = 0; // to detect new alert transitions

  // ── Progress save ────────────────────────────────────────
  const _SAVE_KEY = 'botr_save';

  function _saveProgress() {
    try {
      const prev = _loadProgress();
      localStorage.setItem(_SAVE_KEY, JSON.stringify({
        level:    _currentLevel,
        maxLevel: Math.max(_currentLevel, prev.maxLevel || 0),
      }));
    } catch (e) {}
  }

  function _loadProgress() {
    try { return JSON.parse(localStorage.getItem(_SAVE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function getSavedProgress() { return _loadProgress(); }

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

  // ── Camera offset (viewport scrolling) ──────────────────────
  const VIEWPORT_COLS = 20;
  const VIEWPORT_ROWS = 20;
  const VIEWPORT_W    = VIEWPORT_COLS * Tilemap.TILE_SIZE; // 960 px
  const VIEWPORT_H    = VIEWPORT_ROWS * Tilemap.TILE_SIZE; // 960 px
  const _HUD_HEIGHT   = 56; // pixels reserved at top for HUD bar
  let _camX = 0;  // world-space left edge of viewport
  let _camY = 0;  // world-space top edge of viewport
  const CAM_SMOOTH = 12; // camera lerp speed (higher = tighter follow)

  // ── Held-key movement repeat ─────────────────────────────
  const HOLD_INITIAL = 0.28; // seconds before repeat fires after initial press
  const HOLD_REPEAT  = 0.16; // seconds between repeats while key is held
  let _holdDir   = null;     // { dx, dy } of currently held direction
  let _holdTimer = 0;        // countdown to next repeat move

  // ── Fail flash ───────────────────────────────────────────
  let _failFlash = 0;

  // ── Camera shake ─────────────────────────────────────────
  const SHAKE_DURATION      = 0.55;
  const SHAKE_AMP           = 9;
  const EXPLODE_SHAKE_DURATION = 0.35;
  const EXPLODE_SHAKE_AMP      = 6;
  let _shakeDur        = 0;
  let _explodeShakeDur = 0;
  let _shakeX   = 0;
  let _shakeY   = 0;

  // ── Cached threat level (for rendering) ──────────────────
  let _threat = 0;

  // ── Grace period after level start (prevents instant detection) ─
  const GRACE_DURATION = 1.5; // seconds
  let _graceTimer = 0;

  // ── Global alert system ───────────────────────────────────
  // Alert level (0-1) rises while enemies are in ALERT state and falls when
  // they return to search/patrol.  Fail is triggered only if the level stays
  // above ALERT_FAIL_THRESHOLD for ALERT_FAIL_DURATION seconds, replacing the
  // old instant-fail on physical catch.
  const ALERT_RISE_RATE      = 0.45; // per alerting enemy per second
  const ALERT_FALL_RATE      = 0.22; // per second when no enemy is alert
  const ALERT_FAIL_THRESHOLD = 0.85; // level that starts the fail countdown
  const ALERT_FAIL_DURATION  = 3.0;  // seconds at threshold before fail
  let _globalAlert    = 0;
  let _alertHoldTimer = 0;

  // ── Debug mode (# key) ───────────────────────────────────
  let _debugMode = false;

  // ── Conveyor tracking ────────────────────────────────────
  // Prevents conveyors from chaining more than MAX_CONVEYOR_CHAIN tiles per player action.
  const MAX_CONVEYOR_CHAIN = 4;
  let _conveyorChain = 0;

  // ── Trap tracking ────────────────────────────────────────
  // Spike to add to alert when a trap tile is triggered.
  const TRAP_ALERT_SPIKE = 0.55;

  function init(canvas) {
    _canvas = canvas;
    _ctx    = canvas.getContext('2d');
    Input.init();

    // Debug panel: apply button + prevent game keys from firing while typing
    const _applyBtn  = document.getElementById('debug-apply-btn');
    const _dtInput   = document.getElementById('debug-detect-time');
    const _csInput   = document.getElementById('debug-cone-scale');
    const _jumpBtn   = document.getElementById('debug-jump-btn');
    const _lvlInput  = document.getElementById('debug-level-select');
    const _stopAndApplyOnEnter = e => { e.stopPropagation(); if (e.key === 'Enter') _applyDebugSettings(); };
    const _stopOnKey = e => e.stopPropagation();
    if (_applyBtn) _applyBtn.addEventListener('click', _applyDebugSettings);
    if (_dtInput)  _dtInput.addEventListener('keydown', _stopAndApplyOnEnter);
    if (_csInput)  _csInput.addEventListener('keydown', _stopAndApplyOnEnter);
    if (_lvlInput) _lvlInput.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') _jumpToDebugLevel(); });
    if (_jumpBtn)  _jumpBtn.addEventListener('click', _jumpToDebugLevel);

    _loadLevel(_currentLevel);
    Menu.show(_onStart, _onContinue);
  }

  function _applyDebugSettings() {
    const dtVal = parseFloat(document.getElementById('debug-detect-time').value);
    const csVal = parseFloat(document.getElementById('debug-cone-scale').value) / 100;
    if (!isNaN(dtVal) && dtVal > 0) EnemyManager.setDetectTime(dtVal);
    if (!isNaN(csVal) && csVal > 0) EnemyManager.setConeScale(csVal);
  }

  function _jumpToDebugLevel() {
    const lvlVal = parseInt(document.getElementById('debug-level-select').value, 10);
    if (isNaN(lvlVal)) return;
    const idx = Math.max(0, Math.min(Levels.count() - 1, lvlVal - 1));
    UI.hide();
    _startLevel(idx);
  }

  function _onStart() {
    _startLevel(_currentLevel);
  }

  function _onContinue(savedLevel) {
    _currentLevel = savedLevel;
    _startLevel(savedLevel);
  }

  function _loadLevel(index) {
    const config = Levels.get(index);
    if (!config) return false;

    // Apply visual theme for this level
    const theme = Themes.get(index);
    Tilemap.setTheme(theme);
    UI.setTheme(theme);

    // Fixed viewport canvas — game always shows VIEWPORT_COLS×VIEWPORT_ROWS tiles
    _canvas.width  = VIEWPORT_W;
    _canvas.height = VIEWPORT_H + _HUD_HEIGHT;

    // Camera starts at top-left of map (updated each frame to follow player)
    _camX = 0;
    _camY = 0;

    // Generate a fresh map for this level
    const generated = MapGen.generate(config);

    // Redistribute key positions to better dead-end spots within each zone.
    const mapGrid = _randomizeKeyPositions(generated);

    // Place puzzle elements (pressure plates, doors, lasers, etc.) around the
    // keys now that they are in their final positions.
    const puzzleLinks = MapGen.addPuzzleElements(
      mapGrid,
      generated.cols, generated.rows,
      generated.doorRows,
      generated.playerStart.col, generated.playerStart.row,
      config
    );

    // Init subsystems
    Tilemap.init(generated.cols, generated.rows, mapGrid);
    FogManager.init(generated.cols, generated.rows, generated.playerStart.col, generated.playerStart.row);
    Player.init(generated.playerStart.col, generated.playerStart.row, config.startBombs || 0);
    EnemyManager.init(generated.enemies);
    BombManager.init();
    PuzzleManager.init(generated.cols, generated.rows, puzzleLinks);

    // Snap camera to player start to avoid a panning-in effect on level load
    _camX = Player.getPx() - VIEWPORT_W / 2;
    _camY = Player.getPy() - VIEWPORT_H / 2;

    _totalKeysCollected = 0;
    UI.setHUD(index + 1, Levels.count(), Player.getColorKeys(), Player.getBombAmmo(), _totalKeysCollected);

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
    _explodeShakeDur = 0;
    _shakeX = 0;
    _shakeY = 0;
    _threat = 0;
    _graceTimer = GRACE_DURATION;
    _globalAlert    = 0;
    _alertHoldTimer = 0;
    _holdDir   = null;
    _holdTimer = 0;
    _conveyorChain = 0;
    _levelTimer = 0;
    _prevAlertCount = 0;
    // Close pause overlay if open (e.g. after restart from pause)
    const pauseEl = document.getElementById('pause-overlay');
    if (pauseEl) pauseEl.classList.add('hidden');
    _saveProgress();
    Music.play();
  }

  const _KEY_HEX = { yellow: '#ffee00', red: '#ff4455', blue: '#4488ff', green: '#44ff88' };

  function _onKeyCollect(col, row, keyColor) {
    _totalKeysCollected++;
    UI.setHUD(_currentLevel + 1, Levels.count(), Player.getColorKeys(), Player.getBombAmmo(), _totalKeysCollected);
    UI.flashKeyCollect(keyColor);
    Sound.keyPickup();
    UI.spawnFloatText('KEY FOUND', Player.getPx(), Player.getPy() - 30, _KEY_HEX[keyColor] || '#ffee00');
  }

  // ── Bomb placement flash (brief screen flash on placement) ─
  let _bombPlaceFlash = 0;

  function _onAmmoCollect() {
    UI.setHUD(_currentLevel + 1, Levels.count(), Player.getColorKeys(), Player.getBombAmmo(), _totalKeysCollected);
    UI.flashAmmoCollect();
    UI.spawnFloatText('+2 AMMO', Player.getPx(), Player.getPy() - 30, '#00ff88');
  }

  function _onDoorOpen(col, row) {
    Sound.doorOpen();
    Tilemap.startDoorOpenEffect(col, row);
    const TS = Tilemap.TILE_SIZE;
    UI.spawnFloatText('DOOR UNLOCKED', col * TS + TS / 2, row * TS + TS / 2 - 40, '#00ffcc');
  }

  function _onExit() {
    _state = STATE.WIN;
    Sound.levelComplete();
    Music.stop();
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
      }, _levelTimer);
    }
  }

  function _onDetected() {
    if (_state !== STATE.PLAYING) return;
    _state = STATE.FAIL;
    Music.stop();
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
      UI.setDebugMode(_debugMode);
      const panel = document.getElementById('debug-panel');
      if (panel) {
        if (_debugMode) {
          document.getElementById('debug-detect-time').value = EnemyManager.getDetectTime().toFixed(2);
          document.getElementById('debug-cone-scale').value  = Math.round(EnemyManager.getConeScale() * 100);
          const lvlInput = document.getElementById('debug-level-select');
          if (lvlInput) {
            lvlInput.max   = Levels.count();
            lvlInput.value = _currentLevel + 1;
          }
          panel.classList.remove('hidden');
        } else {
          panel.classList.add('hidden');
        }
      }
    }

    // Toggle fog-of-war mode (F key) — works from any game state
    if (Input.isPressed('KeyF')) {
      FogManager.toggle();
      UI.setFogMode(FogManager.isEnabled());
    }

    // Toggle ghost mode (G key) — player can move through walls
    if (Input.isPressed('KeyG')) {
      Player.setGhostMode(!Player.isGhostMode());
      UI.setGhostMode(Player.isGhostMode());
    }

    // Info overlay toggle — works from any game state
    if (Input.isPressed('KeyI')) {
      if (UI.isInfoVisible()) UI.hideInfo();
      else UI.showInfo();
    }
    if (Input.isPressed('Escape') && UI.isInfoVisible()) {
      UI.hideInfo();
    }

    // Pause toggle — P key or Escape (when info overlay is not open)
    if (!UI.isInfoVisible() && Input.isPressed('KeyP') && (_state === STATE.PLAYING || _state === STATE.PAUSED)) {
      togglePause();
    }
    if (Input.isPressed('Escape') && !UI.isInfoVisible() && _state === STATE.PLAYING) {
      _pause();
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

    // When paused, stop further updates
    if (_state === STATE.PAUSED) return;

    // Camera shake decay — runs on real time regardless of game state so the
    // post-detection shake still plays during FAIL/WIN screens.
    {
      let shakeAmp = 0;
      if (_shakeDur > 0) {
        _shakeDur -= rawDt;
        if (_shakeDur < 0) _shakeDur = 0;
        shakeAmp = Math.max(shakeAmp, SHAKE_AMP * (_shakeDur / SHAKE_DURATION));
      }
      if (_explodeShakeDur > 0) {
        _explodeShakeDur -= rawDt;
        if (_explodeShakeDur < 0) _explodeShakeDur = 0;
        shakeAmp = Math.max(shakeAmp, EXPLODE_SHAKE_AMP * (_explodeShakeDur / EXPLODE_SHAKE_DURATION));
      }
      if (shakeAmp > 0) {
        _shakeX = (Math.random() * 2 - 1) * shakeAmp;
        _shakeY = (Math.random() * 2 - 1) * shakeAmp;
      } else {
        _shakeX = 0;
        _shakeY = 0;
      }
    }

    if (_state !== STATE.PLAYING) return;

    // Level timer
    _levelTimer += rawDt;

    // Tilemap animation
    Tilemap.update(dt);

    // Player input & movement — immediate on press, repeat on hold
    const { dx, dy } = Input.getMoveDelta();
    if (dx !== 0 || dy !== 0) {
      // Fresh key press: move immediately and start hold timer
      Player.tryMove(dx, dy, _onKeyCollect, _onDoorOpen, null);
      _holdDir      = { dx, dy };
      _holdTimer    = HOLD_INITIAL;
      _conveyorChain = 0; // manual move resets conveyor chain
    } else {
      const held = Input.getHeldDir();
      if (held.dx !== 0 || held.dy !== 0) {
        // Key is still held — check if direction changed
        if (!_holdDir || _holdDir.dx !== held.dx || _holdDir.dy !== held.dy) {
          _holdDir   = held;
          _holdTimer = HOLD_INITIAL;
        }
        _holdTimer -= rawDt;
        if (_holdTimer <= 0 && !Player.isMoving()) {
          Player.tryMove(held.dx, held.dy, _onKeyCollect, _onDoorOpen, null);
          _holdTimer     = HOLD_REPEAT;
          _conveyorChain = 0;
        }
      } else {
        _holdDir   = null;
        _holdTimer = 0;
      }
    }

    // Bomb placement — Space key
    if (Input.isPressed('Space') && Player.getBombAmmo() > 0) {
      Player.useBomb();
      BombManager.placeBomb(Player.getPx(), Player.getPy());
      Sound.bombPlace();
      _bombPlaceFlash = 0.12;
      UI.setHUD(_currentLevel + 1, Levels.count(), Player.getColorKeys(), Player.getBombAmmo(), _totalKeysCollected);
    }

    // Advance player movement animation and process tile events
    Player.update(dt, _onKeyCollect, _onExit, _onAmmoCollect);

    // ── Puzzle: conveyor tiles ───────────────────────────────
    // When the player finishes arriving on a conveyor tile, push them one step
    // in the conveyor direction.  Cap at 4 chained conveyor steps to prevent loops.
    if (!Player.isMoving() && _conveyorChain < 4) {
      const convDir = Tilemap.getConveyorDir(Player.getCol(), Player.getRow());
      if (convDir) {
        Player.tryMove(convDir.dx, convDir.dy, _onKeyCollect, _onDoorOpen, null);
        _conveyorChain++;
      } else {
        _conveyorChain = 0;
      }
    } else if (!Player.isMoving()) {
      const convDir = Tilemap.getConveyorDir(Player.getCol(), Player.getRow());
      if (!convDir) _conveyorChain = 0;
    }

    // ── Puzzle: update PuzzleManager ─────────────────────────
    PuzzleManager.update(dt, Player.getCol(), Player.getRow());

    // ── Puzzle: trap trigger ─────────────────────────────────
    if (PuzzleManager.consumeTrapTrigger()) {
      _globalAlert = Math.min(1, _globalAlert + TRAP_ALERT_SPIKE);
      _shakeDur    = Math.max(_shakeDur, SHAKE_DURATION * 0.5);
      Sound.alarm();
      UI.spawnFloatText('TRAP TRIGGERED', Player.getPx(), Player.getPy() - 40, '#ff6600');
    }

    // Expand fog exploration to current player position
    FogManager.reveal(Player.getCol(), Player.getRow());

    // Bombs
    BombManager.update(dt);
    if (BombManager.takeExplosionShake()) {
      _explodeShakeDur = Math.max(_explodeShakeDur, EXPLODE_SHAKE_DURATION);
    }

    // Enemies
    EnemyManager.update(dt, Player.getPx(), Player.getPy());

    // Grace period: suppress detection for the first seconds of a level
    if (_graceTimer > 0) _graceTimer -= rawDt;

    // ── Global alert level ────────────────────────────────────────────────
    // Rise while any enemy is in ALERT state; fall when the coast is clear.
    const alertCount = EnemyManager.getAlertCount();

    // Detect new alert event — spawn warning notification once per alert rise
    const isNewAlertEvent = alertCount > 0 && _prevAlertCount === 0 && !_debugMode && _graceTimer <= 0;
    if (isNewAlertEvent) {
      Sound.alarm();
      UI.spawnFloatText('⚠ ALERT', Player.getPx(), Player.getPy() - 52, '#ff2244');
    }
    _prevAlertCount = alertCount;

    if (alertCount > 0) {
      _globalAlert = Math.min(1, _globalAlert + alertCount * ALERT_RISE_RATE * rawDt);
    } else {
      _globalAlert = Math.max(0, _globalAlert - ALERT_FALL_RATE * rawDt);
    }

    // Physical catch (enemy closes within catch radius) spikes alert to max
    // instead of triggering an instant fail.
    if (EnemyManager.wasDetected() && !_debugMode && _graceTimer <= 0) {
      _globalAlert = 1;
    }

    // Fail only if alert sustains above threshold long enough (tension window).
    if (!_debugMode && _graceTimer <= 0) {
      if (_globalAlert >= ALERT_FAIL_THRESHOLD) {
        _alertHoldTimer += rawDt;
        if (_alertHoldTimer >= ALERT_FAIL_DURATION) {
          _onDetected();
          return;
        }
      } else {
        // Timer drains at 2× the fill rate so brief escapes reset it quickly.
        _alertHoldTimer = Math.max(0, _alertHoldTimer - rawDt * 2);
      }
    }

    UI.setAlertLevel(_globalAlert, _alertHoldTimer, ALERT_FAIL_DURATION);

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

    // Camera — smoothly follow the player pixel position
    const _camTargetX = Player.getPx() - VIEWPORT_W / 2;
    const _camTargetY = Player.getPy() - VIEWPORT_H / 2;
    const camFactor = Math.min(1, rawDt * CAM_SMOOTH);
    _camX = Utils.lerp(_camX, _camTargetX, camFactor);
    _camY = Utils.lerp(_camY, _camTargetY, camFactor);

    // Fail flash decay
    if (_failFlash > 0) _failFlash -= rawDt;
    if (_bombPlaceFlash > 0) _bombPlaceFlash -= rawDt;

    // HUD
    UI.update(rawDt);
    UI.updateMinimap(rawDt);
    UI.setHUD(_currentLevel + 1, Levels.count(), Player.getColorKeys(), Player.getBombAmmo(), _totalKeysCollected);
  }

  function _render() {
    const ctx = _ctx;
    const W = _canvas.width;
    const H = _canvas.height;

    // Dark background for map region (shown around edges if map is smaller than viewport)
    const theme = Tilemap.getTheme();
    ctx.fillStyle = theme ? theme.background : '#0a0a18';
    ctx.fillRect(0, _HUD_HEIGHT, W, H - _HUD_HEIGHT);

    // Map area — clip to viewport, then translate world coords into screen space
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, _HUD_HEIGHT, VIEWPORT_W, VIEWPORT_H);
    ctx.clip();
    ctx.translate(-_camX + _shakeX, _HUD_HEIGHT - _camY + _shakeY);
    Tilemap.draw(ctx);
    PuzzleManager.draw(ctx);  // laser beams + timed-door arcs (drawn above tilemap, below fog)
    FogManager.draw(ctx);
    BombManager.draw(ctx);
    EnemyManager.draw(ctx, _debugMode);
    Player.draw(ctx);
    UI.drawFloatTexts(ctx);   // floating event labels (KEY FOUND, DOOR UNLOCKED, etc.)
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
    UI.drawAlertWarning(ctx, W, H);
    UI.drawScanlines(ctx, W, H);
    UI.drawMinimap(ctx, W, H, Player.getCol(), Player.getRow(), _debugMode);
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

  // ── Key randomisation ────────────────────────────────────
  // Redistributes colored key tiles to better dead-end positions within
  // their designated zones.  Each colored key must stay in the zone
  // directly below its matching door (preserving the puzzle order).
  //   Yellow key → main zone (below all doors)
  //   Red key    → zone between door 1 and door 0 (from player perspective)
  //   Blue key   → zone between door 2 and door 1
  //   Green key  → zone between door 3 and door 2
  function _randomizeKeyPositions(def) {
    const { cols, rows, playerStart, map } = def;
    const minKeyDist = def.minKeyDist ?? 6;
    const T  = Tilemap.TILE;
    const grid = map.slice();

    // Collect all door tile rows
    const allDoorRows = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = grid[r * cols + c];
        if (T.DOOR === t || T.DOOR_RED === t || T.DOOR_BLUE === t || T.DOOR_GREEN === t) {
          if (!allDoorRows.includes(r)) allDoorRows.push(r);
          break;
        }
      }
    }
    allDoorRows.sort((a, b) => a - b); // top-to-bottom
    const n = allDoorRows.length;
    if (n === 0) return grid;

    // Zone boundary helper (zone 0 = main zone below last door)
    function getZoneRange(zoneIdx) {
      if (zoneIdx === 0) return [allDoorRows[n - 1] + 1, rows - 2];
      const uo = n - 1 - zoneIdx;
      const lo = n - zoneIdx;
      if (uo < 0 || lo >= n) return null;
      return [allDoorRows[uo] + 1, allDoorRows[lo] - 1];
    }

    // Colored key specs: [tile, zone index]
    const KEY_SPECS = [
      { tile: T.KEY,       zoneIdx: 0 },
      { tile: T.KEY_RED,   zoneIdx: 1 },
      { tile: T.KEY_BLUE,  zoneIdx: 2 },
      { tile: T.KEY_GREEN, zoneIdx: 3 },
    ];

    // Count and clear each colored key type
    const keyCounts = {};
    for (const { tile } of KEY_SPECS) keyCounts[tile] = 0;
    for (let i = 0; i < grid.length; i++) {
      if (keyCounts[grid[i]] !== undefined) {
        keyCounts[grid[i]]++;
        grid[i] = T.FLOOR;
      }
    }

    // Redistribute each color within its zone using dead-end biasing
    for (const { tile, zoneIdx } of KEY_SPECS) {
      const count = keyCounts[tile] || 0;
      if (count === 0) continue;

      const range = getZoneRange(zoneIdx);
      if (!range) continue;
      const [r1, r2] = range;

      const candidates = [];
      for (let r = r1; r <= r2; r++) {
        for (let c = 1; c < cols - 1; c++) {
          const idx = r * cols + c;
          if (grid[idx] !== T.FLOOR) continue;
          const mDist = Math.abs(r - playerStart.row) + Math.abs(c - playerStart.col);
          if (zoneIdx === 0 && mDist < minKeyDist) continue;

          let wallN = 0;
          for (const [dc, dr] of [[0,-1],[0,1],[-1,0],[1,0]]) {
            const nc = c + dc, nr = r + dr;
            if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) { wallN++; continue; }
            if (grid[nr * cols + nc] === T.WALL) wallN++;
          }
          candidates.push({ idx, wallN, mDist });
        }
      }

      if (candidates.length === 0) {
        // Fallback: place anywhere in the zone
        for (let r = r1; r <= r2 && count > 0; r++) {
          for (let c = 1; c < cols - 1; c++) {
            const idx = r * cols + c;
            if (grid[idx] === T.FLOOR) { grid[idx] = tile; break; }
          }
        }
        continue;
      }

      candidates.sort((a, b) => b.wallN - a.wallN || b.mDist - a.mDist);

      const placed = [];
      for (const { idx } of candidates) {
        if (placed.length >= count) break;
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const tooClose = placed.some(pi => {
          const pc = pi % cols, pr = Math.floor(pi / cols);
          return Math.abs(c - pc) + Math.abs(r - pr) < 4;
        });
        if (!tooClose) { placed.push(idx); grid[idx] = tile; }
      }
      // Relax spread constraint if needed
      for (const { idx } of candidates) {
        if (placed.length >= count) break;
        if (!placed.includes(idx)) { placed.push(idx); grid[idx] = tile; }
      }
    }

    return grid;
  }

  // ── Pause helpers ────────────────────────────────────────
  function _pause() {
    if (_state !== STATE.PLAYING) return;
    _pausedPrevState = STATE.PLAYING;
    _state = STATE.PAUSED;
    const el = document.getElementById('pause-overlay');
    if (el) el.classList.remove('hidden');
  }

  function _resumeFromPause() {
    if (_state !== STATE.PAUSED) return;
    _state = _pausedPrevState || STATE.PLAYING;
    _pausedPrevState = null;
    const el = document.getElementById('pause-overlay');
    if (el) el.classList.add('hidden');
  }

  function togglePause() {
    if (_state === STATE.PAUSED) _resumeFromPause();
    else if (_state === STATE.PLAYING) _pause();
  }

  return { init, start, togglePause, getSavedProgress };
})();
