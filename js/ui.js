// ── ui.js ───────────────────────────────────────────────────
// HUD drawing and overlay management.

const UI = (() => {

  const overlay   = document.getElementById('overlay');
  const overlayTitle   = document.getElementById('overlay-title');
  const overlayMsg     = document.getElementById('overlay-message');
  const overlayBtn     = document.getElementById('overlay-btn');
  const overlayContent = document.getElementById('overlay-content');

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
      'Avoid the patrol robots at all costs.<br><br>' +
      '<small>WASD / Arrow keys to move &nbsp;|&nbsp; R to restart</small>';
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

  // ── HUD (drawn on canvas) ────────────────────────────────
  let _hudFlash = 0;   // key-collected flash timer
  let _hudKeyCount = 0;
  let _hudLevel = 1;
  let _hudTotalLevels = 1;

  function setHUD(level, totalLevels, keys) {
    _hudLevel = level;
    _hudTotalLevels = totalLevels;
    _hudKeyCount = keys;
  }

  function flashKeyCollect() {
    _hudFlash = 0.5;
  }

  function update(dt) {
    if (_hudFlash > 0) _hudFlash -= dt;
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

    ctx.font = 'bold 14px Courier New';
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
    ctx.fillText(`KEY ${_hudKeyCount > 0 ? '⬡'.repeat(_hudKeyCount) : '—'}`, canvasW / 2, y0 + barH / 2);

    // Hint
    ctx.fillStyle = 'rgba(0,255,204,0.45)';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'right';
    ctx.font = '11px Courier New';
    ctx.fillText('[R] RESTART', canvasW - pad, y0 + barH / 2);

    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
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

  return {
    showStart, showLevelComplete, showGameOver, showVictory, hide,
    setHUD, flashKeyCollect, setVignette,
    update, drawHUD, drawScanlines, drawVignette
  };
})();
