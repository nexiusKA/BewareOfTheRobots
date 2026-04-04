// ── ui.js ───────────────────────────────────────────────────
// HUD drawing and overlay management.

const UI = (() => {

  const overlay   = document.getElementById('overlay');
  const overlayTitle   = document.getElementById('overlay-title');
  const overlayMsg     = document.getElementById('overlay-message');
  const overlayBtn     = document.getElementById('overlay-btn');
  const overlayContent = document.getElementById('overlay-content');
  const infoOverlay    = document.getElementById('info-overlay');

  // ── Overlay helpers ──────────────────────────────────────
  function _clearTheme() {
    overlay.classList.remove('overlay-start','overlay-win','overlay-fail','overlay-gameover');
    overlayContent.classList.remove('overlay-start','overlay-win','overlay-fail','overlay-gameover');
  }

  function showStart(levelCount, onStart) {
    _clearTheme();
    overlay.classList.add('overlay-start');
    overlayContent.classList.add('overlay-start');
    overlayTitle.textContent = 'BEWARE OF THE ROBOTS';
    overlayMsg.innerHTML =
      'A stealth puzzle game.<br>' +
      'Collect keys, open doors, reach the exit.<br>' +
      'Avoid the patrol robots at all costs.<br>' +
      'Place bombs with <b>[SPACE]</b> to destroy enemies.<br><br>' +
      '<small>WASD / Arrow keys to move &nbsp;|&nbsp; Space to place bomb &nbsp;|&nbsp; R to restart</small><br>' +
      '<small>Press <b>[I]</b> in-game for full controls &amp; enemy info</small>';
    overlayBtn.textContent = 'START GAME';
    overlayBtn.onclick = onStart;
    overlay.classList.remove('hidden');
  }

  function showLevelComplete(levelNum, totalLevels, onNext) {
    _clearTheme();
    overlay.classList.add('overlay-win');
    overlayContent.classList.add('overlay-win');
    overlayTitle.textContent = 'LEVEL CLEAR';
    const isLast = levelNum >= totalLevels;
    overlayMsg.innerHTML =
      `Sector ${levelNum} secured.<br>` +
      (isLast ? 'All sectors cleared — mission complete!' : `Proceeding to sector ${levelNum + 1}...`);
    overlayBtn.textContent = isLast ? 'PLAY AGAIN' : 'NEXT LEVEL';
    overlayBtn.onclick = onNext;
    overlay.classList.remove('hidden');
  }

  function showGameOver(onRestart) {
    _clearTheme();
    overlay.classList.add('overlay-fail');
    overlayContent.classList.add('overlay-fail');
    overlayTitle.textContent = 'DETECTED';
    overlayMsg.innerHTML =
      'The patrol unit has spotted you.<br>' +
      'Returning to last checkpoint...<br><br>' +
      '<small>Press R or click below to retry instantly</small>';
    overlayBtn.textContent = 'RETRY';
    overlayBtn.onclick = onRestart;
    overlay.classList.remove('hidden');
  }

  function showVictory(onRestart) {
    _clearTheme();
    overlay.classList.add('overlay-gameover');
    overlayContent.classList.add('overlay-gameover');
    overlayTitle.textContent = 'MISSION COMPLETE';
    overlayMsg.innerHTML =
      'All sectors have been cleared.<br>' +
      'You evaded every patrol unit.<br>' +
      'Well done, agent.';
    overlayBtn.textContent = 'PLAY AGAIN';
    overlayBtn.onclick = onRestart;
    overlay.classList.remove('hidden');
  }

  function hide() {
    overlay.classList.add('hidden');
  }

  // ── Info overlay ─────────────────────────────────────────
  let _infoVisible = false;

  function showInfo() {
    infoOverlay.querySelector('#info-close-btn').onclick = hideInfo;
    infoOverlay.classList.remove('hidden');
    _infoVisible = true;
  }

  function hideInfo() {
    infoOverlay.classList.add('hidden');
    _infoVisible = false;
  }

  function isInfoVisible() { return _infoVisible; }

  // ── HUD (drawn on canvas) ────────────────────────────────
  let _hudFlash = 0;   // key-collected flash timer
  let _hudAmmoFlash = 0; // ammo-collected flash timer
  let _hudKeyCount = 0;
  let _hudLevel = 1;
  let _hudTotalLevels = 1;
  let _hudBombs = 0;

  function setHUD(level, totalLevels, keys, bombs) {
    _hudLevel = level;
    _hudTotalLevels = totalLevels;
    _hudKeyCount = keys;
    _hudBombs = bombs !== undefined ? bombs : 0;
  }

  function flashKeyCollect() {
    _hudFlash = 0.5;
  }

  function flashAmmoCollect() {
    _hudAmmoFlash = 0.5;
  }

  function update(dt) {
    if (_hudFlash > 0) _hudFlash -= dt;
    if (_hudAmmoFlash > 0) _hudAmmoFlash -= dt;
    if (_dangerLevel >= DANGER_THRESHOLD) {
      _dangerPulse += dt;
    } else {
      _dangerPulse = 0;
    }
  }

  function drawHUD(ctx, canvasW, canvasH) {
    const pad = 12;
    const barH = 38;
    const y0 = 0;

    // HUD background bar
    ctx.fillStyle = 'rgba(5,5,20,0.82)';
    ctx.fillRect(0, y0, canvasW, barH);
    ctx.strokeStyle = 'rgba(0,255,204,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, y0, canvasW, barH);

    ctx.font = 'bold 13px Courier New'; // 13px to fit sector, key, and bomb counters in the HUD bar
    ctx.textBaseline = 'middle';

    // Level
    ctx.fillStyle = '#00ffcc';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00ffcc';
    ctx.fillText(`SECTOR ${_hudLevel} / ${_hudTotalLevels}`, pad, y0 + barH / 2);

    // Keys — flash yellow on collect
    const keyColor = _hudFlash > 0
      ? `rgba(255,238,0,${0.6 + (_hudFlash / 0.5) * 0.4})`
      : '#ffee00';
    ctx.fillStyle = keyColor;
    ctx.shadowColor = keyColor;
    ctx.textAlign = 'center';
    const centerX = canvasW / 2;
    ctx.fillText(`KEY ${_hudKeyCount > 0 ? '⬡'.repeat(_hudKeyCount) : '—'}`, centerX - 50, y0 + barH / 2);

    // Bombs — flash green on collect
    const bombColor = _hudAmmoFlash > 0
      ? `rgba(0,255,136,${0.6 + (_hudAmmoFlash / 0.5) * 0.4})`
      : (_hudBombs === 0 ? 'rgba(150,150,150,0.5)' : '#00ff88');
    ctx.fillStyle = bombColor;
    ctx.shadowColor = bombColor;
    const bombDots = _hudBombs > 0 ? '◆'.repeat(_hudBombs) : '—';
    ctx.fillText(`💣 ${bombDots}`, centerX + 60, y0 + barH / 2);

    // Hints — right-aligned: restart + info toggle
    ctx.fillStyle = 'rgba(0,255,204,0.45)';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'right';
    ctx.font = '11px Courier New';
    ctx.fillText('[R] RESTART  [I] INFO', canvasW - pad, y0 + barH / 2);

    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }

  // ── Mini-map ─────────────────────────────────────────────
  // Drawn in the bottom-right corner of the canvas (over the map area).
  // Shows the full level layout at reduced scale with the player's position.
  const MINIMAP_MAX  = 150; // max dimension in pixels
  const MINIMAP_PAD  = 10;  // padding from canvas edge
  let _minimapPulse  = 0;   // for player dot pulsing

  function drawMinimap(ctx, canvasW, canvasH, playerCol, playerRow, debugMode) {
    const cols = Tilemap.cols();
    const rows = Tilemap.rows();
    if (cols === 0 || rows === 0) return;

    // Scale minimap to fit within MINIMAP_MAX while keeping aspect ratio
    let mmW, mmH;
    if (cols >= rows) {
      mmW = MINIMAP_MAX;
      mmH = Math.round(MINIMAP_MAX * rows / cols);
    } else {
      mmH = MINIMAP_MAX;
      mmW = Math.round(MINIMAP_MAX * cols / rows);
    }

    const tW = mmW / cols; // tile width in minimap pixels
    const tH = mmH / rows; // tile height in minimap pixels
    const mmX = canvasW - mmW - MINIMAP_PAD;
    const mmY = canvasH - mmH - MINIMAP_PAD;

    ctx.save();

    // Background panel
    ctx.fillStyle = 'rgba(5,5,20,0.78)';
    ctx.strokeStyle = 'rgba(0,255,204,0.35)';
    ctx.lineWidth = 1;
    ctx.fillRect(mmX - 3, mmY - 3, mmW + 6, mmH + 6);
    ctx.strokeRect(mmX - 3, mmY - 3, mmW + 6, mmH + 6);

    // Label
    ctx.font = '8px Courier New';
    ctx.fillStyle = 'rgba(0,255,204,0.55)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('MAP', mmX - 2, mmY - 5);

    // Draw tiles
    const T = Tilemap.TILE;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = Tilemap.get(c, r);
        const tx = mmX + c * tW;
        const ty = mmY + r * tH;
        const tw = Math.max(1, tW);
        const th = Math.max(1, tH);

        if (tile === T.WALL) {
          ctx.fillStyle = '#2a2a55';
        } else if (tile === T.FLOOR || tile === T.DOOR_OPEN) {
          ctx.fillStyle = '#141428';
        } else if (tile === T.DOOR) {
          ctx.fillStyle = '#ff8800';
        } else if (tile === T.KEY) {
          ctx.fillStyle = debugMode ? '#ffee00' : '#141428';
        } else if (tile === T.EXIT) {
          ctx.fillStyle = '#00ffcc';
        } else if (tile === T.AMMO) {
          ctx.fillStyle = debugMode ? '#00ff88' : '#141428';
        } else {
          ctx.fillStyle = '#141428';
        }
        ctx.fillRect(tx, ty, tw, th);
      }
    }

    // Player dot — pulsing white circle
    const dotR    = Math.max(2, Math.min(tW, tH) * 1.8);
    const pulse   = (Math.sin(_minimapPulse * 5) + 1) / 2; // 0-1
    const dotX    = mmX + (playerCol + 0.5) * tW;
    const dotY    = mmY + (playerRow + 0.5) * tH;

    ctx.shadowBlur  = 4 + pulse * 4;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle   = `rgba(255,255,255,${0.85 + pulse * 0.15})`;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function updateMinimap(dt) {
    _minimapPulse += dt;
  }

  // ── Scanline overlay for atmosphere ─────────────────────
  function drawScanlines(ctx, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }
  }

  // ── Alert vignette ───────────────────────────────────────
  let _vignetteIntensity = 0;

  function setVignette(intensity) {
    _vignetteIntensity = Utils.clamp(intensity, 0, 1);
  }

  function drawVignette(ctx, w, h) {
    if (_vignetteIntensity <= 0) return;
    const grad = ctx.createRadialGradient(w/2, h/2, h*0.2, w/2, h/2, h*0.85);
    grad.addColorStop(0, 'rgba(255,30,30,0)');
    grad.addColorStop(1, `rgba(255,30,30,${_vignetteIntensity * 0.45})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // ── Danger text warning ──────────────────────────────────
  const DANGER_THRESHOLD = 0.65;
  let _dangerLevel  = 0;
  let _dangerPulse  = 0;

  function setDanger(threat) {
    _dangerLevel = threat;
  }

  function drawDangerWarning(ctx, w, h) {
    if (_dangerLevel < DANGER_THRESHOLD) {
      return;
    }
    const fadeIn  = Utils.clamp((_dangerLevel - DANGER_THRESHOLD) / (1 - DANGER_THRESHOLD), 0, 1);
    const pulse   = (Math.sin(_dangerPulse * 9) + 1) / 2; // 0-1 oscillation
    const alpha   = fadeIn * (0.55 + pulse * 0.45);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10 + pulse * 10;
    ctx.shadowColor = '#ff0000';
    ctx.fillStyle = '#ff2244';
    ctx.fillText('⚠  DANGER  ⚠', w / 2, 56);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  return {
    showStart, showLevelComplete, showGameOver, showVictory, hide,
    showInfo, hideInfo, isInfoVisible,
    setHUD, flashKeyCollect, flashAmmoCollect, setVignette, setDanger,
    update, drawHUD, drawScanlines, drawVignette, drawDangerWarning,
    drawMinimap, updateMinimap
  };
})();
