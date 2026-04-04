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

  // ── Camera offset (viewport scrolling) ──────────────────────
  const VIEWPORT_COLS = 20;
  const VIEWPORT_ROWS = 20;
  const VIEWPORT_W    = VIEWPORT_COLS * Tilemap.TILE_SIZE; // 960 px
  const VIEWPORT_H    = VIEWPORT_ROWS * Tilemap.TILE_SIZE; // 960 px
  const _HUD_HEIGHT   = 38; // pixels reserved at top for HUD bar
  let _camX = 0;  // world-space left edge of viewport
  let _camY = 0;  // world-space top edge of viewport

  // ── Held-key movement repeat ─────────────────────────────
  const HOLD_INITIAL = 0.28; // seconds before repeat fires after initial press
  const HOLD_REPEAT  = 0.16; // seconds between repeats while key is held
  let _holdDir   = null;     // { dx, dy } of currently held direction
  let _holdTimer = 0;        // countdown to next repeat move

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

    // Debug panel: apply button + prevent game keys from firing while typing
    const _applyBtn  = document.getElementById('debug-apply-btn');
    const _dtInput   = document.getElementById('debug-detect-time');
    const _csInput   = document.getElementById('debug-cone-scale');
    const _stopAndApplyOnEnter = e => { e.stopPropagation(); if (e.key === 'Enter') _applyDebugSettings(); };
    if (_applyBtn) _applyBtn.addEventListener('click', _applyDebugSettings);
    if (_dtInput)  _dtInput.addEventListener('keydown', _stopAndApplyOnEnter);
    if (_csInput)  _csInput.addEventListener('keydown', _stopAndApplyOnEnter);

    _loadLevel(_currentLevel);
    UI.showStart(Levels.count(), _onStart);
  }

  function _applyDebugSettings() {
    const dtVal = parseFloat(document.getElementById('debug-detect-time').value);
    const csVal = parseFloat(document.getElementById('debug-cone-scale').value) / 100;
    if (!isNaN(dtVal) && dtVal > 0) EnemyManager.setDetectTime(dtVal);
    if (!isNaN(csVal) && csVal > 0) EnemyManager.setConeScale(csVal);
  }

  function _onStart() {
    UI.hide();
    _startLevel(_currentLevel);
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

    // Init subsystems
    Tilemap.init(generated.cols, generated.rows, _randomizeKeyPositions(generated));
    FogManager.init(generated.cols, generated.rows, generated.playerStart.col, generated.playerStart.row);
    Player.init(generated.playerStart.col, generated.playerStart.row, config.startBombs || 0);
    EnemyManager.init(generated.enemies);
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
    _holdDir   = null;
    _holdTimer = 0;
  }

  function _onKeyCollect() {
    UI.setHUD(_currentLevel + 1, Levels.count(), Player.getKeys(), Player.getBombAmmo());
    UI.flashKeyCollect();
    Sound.keyPickup();
  }

  // ── Bomb placement flash (brief screen flash on placement) ─
  let _bombPlaceFlash = 0;

  function _onAmmoCollect() {
    UI.setHUD(_currentLevel + 1, Levels.count(), Player.getKeys(), Player.getBombAmmo());
    UI.flashAmmoCollect();
  }

  function _onDoorOpen(col, row) {
    Sound.doorOpen();
    Tilemap.startDoorOpenEffect(col, row);
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
      UI.setDebugMode(_debugMode);
      const panel = document.getElementById('debug-panel');
      if (panel) {
        if (_debugMode) {
          document.getElementById('debug-detect-time').value = EnemyManager.getDetectTime().toFixed(2);
          document.getElementById('debug-cone-scale').value  = Math.round(EnemyManager.getConeScale() * 100);
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

    // Player input & movement — immediate on press, repeat on hold
    const { dx, dy } = Input.getMoveDelta();
    if (dx !== 0 || dy !== 0) {
      // Fresh key press: move immediately and start hold timer
      Player.tryMove(dx, dy, _onKeyCollect, _onDoorOpen, null);
      _holdDir   = { dx, dy };
      _holdTimer = HOLD_INITIAL;
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
          _holdTimer = HOLD_REPEAT;
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
      UI.setHUD(_currentLevel + 1, Levels.count(), Player.getKeys(), Player.getBombAmmo());
    }

    Player.update(dt, _onKeyCollect, _onExit, _onAmmoCollect);

    // Expand fog exploration to current player position
    FogManager.reveal(Player.getCol(), Player.getRow());

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

    // Camera — always centred on player; no clamping so the player stays
    // in the middle of the screen even near map edges (mobile-friendly).
    _camX = Player.getPx() - VIEWPORT_W / 2;
    _camY = Player.getPy() - VIEWPORT_H / 2;

    // Fail flash decay
    if (_failFlash > 0) _failFlash -= rawDt;
    if (_bombPlaceFlash > 0) _bombPlaceFlash -= rawDt;

    // HUD
    UI.update(rawDt);
    UI.updateMinimap(rawDt);
    UI.setHUD(_currentLevel + 1, Levels.count(), Player.getKeys(), Player.getBombAmmo());
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
    FogManager.draw(ctx);
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
  // Returns a copy of def.map with key tiles shuffled to random floor positions
  // inside the zone the player can access without collecting any keys (below all
  // door rows). A BFS from the player start ensures every candidate is reachable.
  // If fewer candidates than keys exist the original layout is used as fallback.
  function _randomizeKeyPositions(def) {
    const { cols, rows, playerStart, map } = def;
    const T  = Tilemap.TILE;
    const grid = map.slice();

    // Locate the highest-indexed door row (= last barrier above the player zone)
    let lastDoorRow = 0;
    findLastDoorRow: for (let r = rows - 1; r >= 0; r--) {
      for (let c = 0; c < cols; c++) {
        if (grid[r * cols + c] === T.DOOR) { lastDoorRow = r; break findLastDoorRow; }
      }
    }

    // Count keys and clear them so the BFS sees plain floor
    let keyCount = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === T.KEY) { keyCount++; grid[i] = T.FLOOR; }
    }

    // BFS from player start — doors are impassable (player has no key yet)
    const startIdx = playerStart.row * cols + playerStart.col;
    const reachable = new Set([startIdx]);
    const queue = [startIdx];
    const passable = new Set([T.FLOOR, T.DOOR_OPEN, T.EXIT, T.AMMO]);
    while (queue.length > 0) {
      const idx = queue.shift();
      const c   = idx % cols;
      const r   = Math.floor(idx / cols);
      for (const [dc, dr] of [[0,-1],[0,1],[-1,0],[1,0]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const ni = nr * cols + nc;
        if (reachable.has(ni)) continue;
        if (passable.has(grid[ni])) { reachable.add(ni); queue.push(ni); }
      }
    }

    // Collect candidate positions: reachable floor in the accessible zone,
    // not the player tile, not adjacent to it, and not an ammo pickup tile.
    const candidates = [];
    for (let r = lastDoorRow + 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const idx = r * cols + c;
        if (!reachable.has(idx)) continue;
        if (grid[idx] !== T.FLOOR) continue;
        if (idx === startIdx) continue;
        const manhattanDist = Math.abs(r - playerStart.row) + Math.abs(c - playerStart.col);
        if (manhattanDist < 2) continue;
        candidates.push(idx);
      }
    }

    if (candidates.length < keyCount) {
      // Not enough space — restore original layout
      return map.slice();
    }

    // Fisher-Yates shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Place keys, enforcing a minimum Manhattan spread of 4 tiles between them
    const placed = [];
    for (const idx of candidates) {
      if (placed.length >= keyCount) break;
      const c = idx % cols;
      const r = Math.floor(idx / cols);
      const tooClose = placed.some(pi => {
        const pc = pi % cols, pr = Math.floor(pi / cols);
        return Math.abs(c - pc) + Math.abs(r - pr) < 4;
      });
      if (!tooClose) { placed.push(idx); grid[idx] = T.KEY; }
    }

    // Relax spread constraint if not enough keys placed
    for (const idx of candidates) {
      if (placed.length >= keyCount) break;
      if (!placed.includes(idx)) { placed.push(idx); grid[idx] = T.KEY; }
    }

    return grid;
  }

  return { init, start };
})();
