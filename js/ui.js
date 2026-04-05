// ── ui.js ───────────────────────────────────────────────────
// HUD drawing and overlay management.

const UI = (() => {

  const overlay        = document.getElementById('overlay');
  const overlayTitle   = document.getElementById('overlay-title');
  const overlayMsg     = document.getElementById('overlay-message');
  const overlayBtn     = document.getElementById('overlay-btn');
  const overlayContent = document.getElementById('overlay-content');
  const infoOverlay    = document.getElementById('info-overlay');

  // Active theme — updated by setTheme() each level load
  let _theme = null;
  function setTheme(theme) { _theme = theme; }

  // ── Overlay helpers ──────────────────────────────────────
  const _ALL_OVERLAY_CLASSES = [
    'overlay-start', 'overlay-win', 'overlay-fail', 'overlay-gameover',
    'overlay-theme-0', 'overlay-theme-1', 'overlay-theme-2',
    'overlay-theme-3', 'overlay-theme-4',
  ];

  function _clearTheme() {
    overlay.classList.remove(..._ALL_OVERLAY_CLASSES);
    overlayContent.classList.remove(..._ALL_OVERLAY_CLASSES);
  }

  // Apply an overlay colour class, plus the active level theme class
  function _applyClass(cls) {
    overlay.classList.add(cls);
    overlayContent.classList.add(cls);
    if (_theme) {
      overlay.classList.add(_theme.overlayClass);
      overlayContent.classList.add(_theme.overlayClass);
    }
  }

  function showStart(levelCount, onStart) {
    _clearTheme();
    _applyClass('overlay-start');
    overlayTitle.innerHTML = '🤖 BEWARE OF THE ROBOTS';
    overlayMsg.innerHTML =
      '<div class="start-tagline">A tactical stealth game — evade, think, survive.</div>' +

      '<div class="start-section">' +
        '<div class="start-section-header">🎯 OBJECTIVE</div>' +
        '<div class="start-feat-row">🔑 Collect <b>COLORED KEYS</b> to unlock matching 🚪 <b>DOORS</b> — yellow key starts in your zone</div>' +
        '<div class="start-feat-row">💡 <b>Route planning</b>: yellow key → open yellow door → find red key → open red door → etc.</div>' +
        '<div class="start-feat-row">💣 Place <b>BOMBS</b> <small>[Space]</small> — 1.2s fuse, blast clears enemies permanently</div>' +
        '<div class="start-feat-row">◆ Grab <b>AMMO</b> crates scattered across each sector for extra charges</div>' +
      '</div>' +

      '<div class="start-section">' +
        '<div class="start-section-header">⚡ KEY MECHANICS</div>' +
        '<div class="start-feat-row">⏱️ Time <b>slows</b> when you near an enemy\'s vision cone — use it to plan</div>' +
        '<div class="start-feat-row">⚠️ Detection meter fills above enemies — escape the cone before it maxes out</div>' +
        '<div class="start-feat-row">🔍 Fully detected? Enemy <b>chases</b> you — alert meter rises; escape before it fills</div>' +
        '<div class="start-feat-row">🚨 <b>Alert meter</b> stays high? You have ~3s to break detection or it\'s game over</div>' +
        '<div class="start-feat-row">❓ If you escape, the enemy <b>searches</b> your last known position then returns to patrol</div>' +
        '<div class="start-feat-row">🛡️ A <b>1.5s grace period</b> protects you at the start of every sector</div>' +
        '<div class="start-feat-row">🌫️ <b>Fog of War</b> <small>[F]</small> &nbsp;•&nbsp; 👻 <b>Ghost Mode</b> <small>[G]</small> &nbsp;•&nbsp; 📋 <b>Full info</b> <small>[I]</small></div>' +
      '</div>' +

      '<div class="start-section">' +
        '<div class="start-section-header">🤖 ENEMY TYPES</div>' +
        '<div class="start-enemy start-patrol">🟠 <b>PATROL</b> — Standard guard, fixed route, amber forward cone</div>' +
        '<div class="start-enemy start-scanner">🔵 <b>SCANNER</b> — Slow but sweeps a wide ±60° cone unpredictably</div>' +
        '<div class="start-enemy start-hunter">🔴 <b>HUNTER</b> — Fast pursuit, razor-thin laser beam, long range</div>' +
        '<div class="start-enemy start-sniffer">🟢 <b>SNIFFER</b> — Detects by radius; walls won\'t help you hide</div>' +
        '<div class="start-enemy start-fast">🟡 <b>FAST</b> — Blinding speed, short range — react before it turns</div>' +
        '<div class="start-enemy start-heavy">⬜ <b>HEAVY</b> — Armored; staggered by one bomb, destroyed by two</div>' +
      '</div>' +

      '<div class="start-controls-hint">🕹️ WASD / ↑↓←→ Move &nbsp;•&nbsp; Space Bomb &nbsp;•&nbsp; R Restart &nbsp;•&nbsp; I Info</div>' +

      '<details class="git-info">' +
        '<summary>Build Info</summary>' +
        '<dl class="git-info-grid">' +
          '<dt>Version</dt><dd>0.' + BUILD_INFO.run + '</dd>' +
          '<dt>Commit</dt><dd>' + BUILD_INFO.sha.slice(0, 7) + '</dd>' +
          '<dt>Branch</dt><dd>' + BUILD_INFO.branch + '</dd>' +
          '<dt>Build Date</dt><dd>' + BUILD_INFO.date + '</dd>' +
        '</dl>' +
      '</details>';
    overlayBtn.textContent = '▶  START GAME';
    overlayBtn.onclick = onStart;
    overlay.classList.remove('hidden');
  }

  function showLevelComplete(levelNum, totalLevels, onNext) {
    _clearTheme();
    _applyClass('overlay-win');
    overlayTitle.textContent = 'SECTOR CLEARED';
    const isLast       = levelNum >= totalLevels;
    const nextTheme    = isLast ? null : Themes.get(levelNum);   // levelNum (1-indexed) doubles as the 0-indexed next-level index
    const themeChanged = nextTheme && nextTheme.id !== (_theme ? _theme.id : -1);
    let msg = `Sector ${levelNum} secured.<br>`;
    if (isLast) {
      msg += 'All sectors cleared — mission complete!';
    } else if (themeChanged) {
      msg += `<em style="opacity:0.7;font-size:0.85em">ENTERING: ${nextTheme.name}</em><br>` +
             `<small>${nextTheme.flavorText}</small>`;
    } else {
      msg += `Proceeding to sector ${levelNum + 1}...`;
    }
    overlayMsg.innerHTML = msg;
    overlayBtn.textContent = isLast ? 'PLAY AGAIN' : 'NEXT SECTOR';
    overlayBtn.onclick = onNext;
    overlay.classList.remove('hidden');
  }

  function showGameOver(onRestart) {
    _clearTheme();
    _applyClass('overlay-fail');
    overlayTitle.textContent = 'CAUGHT';
    overlayMsg.innerHTML =
      'The global alert level was sustained too long — you were caught.<br>' +
      'Escape enemy detection before the alert meter fills completely.<br>' +
      'Break line of sight and stay hidden until the alert clears.<br><br>' +
      '<small>Press R or click below to retry instantly</small>';
    overlayBtn.textContent = 'RETRY';
    overlayBtn.onclick = onRestart;
    overlay.classList.remove('hidden');
  }

  function showVictory(onRestart) {
    _clearTheme();
    _applyClass('overlay-gameover');
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
  let _keyPopTimer  = 0; // scale-pop animation on key pickup
  let _ammoPopTimer = 0; // scale-pop animation on ammo pickup
  const POP_DURATION = 0.25;
  let _hudKeyCount = 0;
  let _hudTotalKeys = 0;
  let _hudLevel = 1;
  let _hudTotalLevels = 1;
  let _hudBombs = 0;
  let _fogEnabled = false;
  let _ghostEnabled = false;
  let _debugEnabled = false;
  let _lastKeyFlashColor = 'yellow';

  function _hexToRgbStr(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  }

  function setFogMode(enabled)   { _fogEnabled = enabled; }
  function setGhostMode(enabled) { _ghostEnabled = enabled; }
  function setDebugMode(enabled) { _debugEnabled = enabled; }

  let _hudColorKeys = { yellow: 0, red: 0, blue: 0, green: 0 };

  function setHUD(level, totalLevels, colorKeys, bombs, totalKeys) {
    _hudLevel = level;
    _hudTotalLevels = totalLevels;
    // Accept either an object {yellow,red,blue,green} or a legacy integer
    if (colorKeys && typeof colorKeys === 'object') {
      _hudColorKeys = colorKeys;
      _hudKeyCount  = Object.values(colorKeys).reduce((a, b) => a + b, 0);
    } else {
      _hudColorKeys = { yellow: colorKeys || 0, red: 0, blue: 0, green: 0 };
      _hudKeyCount  = colorKeys || 0;
    }
    _hudBombs    = bombs    !== undefined ? bombs    : 0;
    _hudTotalKeys = totalKeys !== undefined ? totalKeys : _hudTotalKeys;
  }

  function flashKeyCollect(color) {
    _hudFlash    = 0.5;
    _keyPopTimer = POP_DURATION;
    _lastKeyFlashColor = color || 'yellow';
  }

  function flashAmmoCollect() {
    _hudAmmoFlash = 0.5;
    _ammoPopTimer = POP_DURATION;
  }

  function update(dt) {
    if (_hudFlash > 0)    _hudFlash    -= dt;
    if (_hudAmmoFlash > 0) _hudAmmoFlash -= dt;
    if (_keyPopTimer > 0)  _keyPopTimer  -= dt;
    if (_ammoPopTimer > 0) _ammoPopTimer -= dt;
    if (_dangerLevel >= DANGER_THRESHOLD) {
      _dangerPulse += dt;
    } else {
      _dangerPulse = 0;
    }
    if (_alertLevel >= ALERT_THRESHOLD) {
      _alertPulse += dt;
    } else {
      _alertPulse = 0;
    }
  }

  function drawHUD(ctx, canvasW, canvasH) {
    const pad  = 14;
    const barH = 56;
    const y0   = 0;

    // Theme accent colour (falls back to default cyan)
    const accent = _theme ? _theme.hudColor : '#00ffcc';
    const border = _theme ? _theme.hudBorder : 'rgba(0,255,204,0.2)';

    // HUD background bar — slightly stronger backdrop for readability
    ctx.fillStyle   = 'rgba(4,4,18,0.92)';
    ctx.fillRect(0, y0, canvasW, barH);
    // Bottom border glow line
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, barH - 0.75);
    ctx.lineTo(canvasW, barH - 0.75);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.font          = 'bold 19px Courier New';
    ctx.textBaseline  = 'middle';

    // Level / sector
    ctx.fillStyle   = accent;
    ctx.textAlign   = 'left';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = accent;
    ctx.fillText(`SECTOR ${_hudLevel} / ${_hudTotalLevels}`, pad, y0 + barH / 2 - 6);

    // Theme name (small, dimmed)
    if (_theme) {
      ctx.font      = '13px Courier New';
      ctx.fillStyle = `${accent}88`;
      ctx.shadowBlur = 0;
      ctx.fillText(_theme.name, pad, y0 + barH / 2 + 12);
      ctx.font      = 'bold 19px Courier New';
    }

    // Colored key inventory — chips for each key color
    const KEY_COLORS = [
      { color: '#ffee00', shadowC: '#ffcc00', name: 'yellow' },
      { color: '#ff4455', shadowC: '#cc0022', name: 'red'    },
      { color: '#4488ff', shadowC: '#2255cc', name: 'blue'   },
      { color: '#44ff88', shadowC: '#00cc55', name: 'green'  },
    ];
    const chipW = 52, chipH = 22, chipGap = 8;
    const totalChipW = KEY_COLORS.length * (chipW + chipGap) - chipGap;
    let chipX = canvasW / 2 - totalChipW / 2;
    const chipY = y0 + (barH - chipH) / 2;

    ctx.font = 'bold 13px Courier New';
    for (const { color, shadowC, name } of KEY_COLORS) {
      const count = _hudColorKeys[name] || 0;
      const flash = name === _lastKeyFlashColor && _hudFlash > 0;
      const alpha = count > 0 ? 1 : 0.28;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Chip background
      ctx.shadowBlur  = count > 0 ? 8 : 0;
      ctx.shadowColor = shadowC;
      ctx.fillStyle   = count > 0
        ? (flash ? `rgba(${_hexToRgbStr(color)},${0.55 + (_hudFlash / 0.5) * 0.35})` : color + '55')
        : 'rgba(40,40,60,0.7)';
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, chipW, chipH, 3);
      ctx.fill();

      // Chip border
      ctx.strokeStyle = count > 0 ? color : 'rgba(80,80,100,0.5)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, chipW, chipH, 3);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Key icon + count
      ctx.fillStyle = count > 0 ? color : 'rgba(120,120,140,0.6)';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      const popScale = (flash && _keyPopTimer > 0)
        ? 1 + Math.sin((_keyPopTimer / 0.25) * Math.PI) * 0.2
        : 1;
      ctx.translate(chipX + chipW / 2, chipY + chipH / 2);
      ctx.scale(popScale, popScale);
      ctx.fillText(`⬡ ${count}`, 0, 0);
      ctx.restore();

      chipX += chipW + chipGap;
    }

    ctx.font        = 'bold 19px Courier New';
    ctx.shadowBlur  = 0;

    // Bombs — flash green on collect + scale-pop animation
    const bombColor = _hudAmmoFlash > 0
      ? `rgba(0,255,136,${0.6 + (_hudAmmoFlash / 0.5) * 0.4})`
      : (_hudBombs === 0 ? 'rgba(150,150,150,0.5)' : '#00ff88');
    ctx.fillStyle   = bombColor;
    ctx.shadowColor = bombColor;
    ctx.shadowBlur  = 8;
    const bombDots  = _hudBombs > 0 ? '◆'.repeat(_hudBombs) : '—';
    {
      const bombTx = canvasW / 2 + 160, bombTy = y0 + barH / 2 - 6;
      const bombPop = _ammoPopTimer > 0
        ? 1 + Math.sin((_ammoPopTimer / POP_DURATION) * Math.PI) * 0.25
        : 1;
      ctx.save();
      ctx.translate(bombTx, bombTy);
      ctx.scale(bombPop, bombPop);
      ctx.fillText(`💣 ${bombDots}`, 0, 0);
      ctx.restore();
    }

    // Hints — right-aligned, two lines
    ctx.shadowBlur  = 0;
    ctx.textAlign   = 'right';

    // Primary shortcuts (always visible)
    ctx.font      = '14px Courier New';
    ctx.fillStyle = `${accent}72`;
    ctx.fillText('[R] RESTART  [I] INFO', canvasW - pad, y0 + barH / 2 - 6);

    // Mode shortcuts — draw right-to-left so we can vary colour per button
    const modeY = y0 + barH / 2 + 12;
    ctx.font = '11px Courier New';
    let rx = canvasW - pad;

    const modeBtns = [
      { label: _debugEnabled ? '[#] DBG ON' : '[#] DBG',   active: _debugEnabled },
      { label: _ghostEnabled ? '[G] GHOST ON' : '[G] GHOST', active: _ghostEnabled },
      { label: _fogEnabled   ? '[F] FOG ON'  : '[F] FOG',  active: _fogEnabled   },
    ];
    for (const btn of modeBtns) {
      const w = ctx.measureText(btn.label).width;
      ctx.fillStyle   = btn.active ? accent : `${accent}52`;
      ctx.shadowBlur  = btn.active ? 4 : 0;
      ctx.shadowColor = accent;
      ctx.fillText(btn.label, rx, modeY);
      rx -= w + 10;
    }

    ctx.shadowBlur   = 0;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign    = 'left';

    // Alert meter — thin coloured bar across the bottom edge of the HUD strip.
    // Fills left-to-right as alert level rises; flashes red when critical.
    if (_alertLevel > 0.01) {
      const meterH = 4;
      const meterY = barH - meterH;
      const meterW = Math.round(canvasW * _alertLevel);
      const isHigh = _alertLevel >= ALERT_THRESHOLD;

      // Colour: green → yellow → orange → red
      let r, g;
      if (_alertLevel <= 0.5) {
        r = Math.round(_alertLevel * 2 * 220);
        g = 200;
      } else {
        r = 255;
        g = Math.round((1 - (_alertLevel - 0.5) * 2) * 180);
      }
      const flashAlpha = isHigh ? (0.8 + Math.sin(_alertPulse * 12) * 0.2) : 1;

      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle   = `rgb(${r},${g},0)`;
      ctx.shadowBlur  = isHigh ? 12 : 5;
      ctx.shadowColor = `rgb(${r},${g},0)`;
      ctx.fillRect(0, meterY, meterW, meterH);

      // "ALERT" label and optional countdown text
      ctx.font         = 'bold 11px Courier New';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle    = `rgba(${r},${g},0,0.9)`;
      ctx.shadowBlur   = 3;
      ctx.textAlign    = 'left';
      ctx.fillText('ALERT', pad, meterY - 1);

      if (isHigh && _alertHoldTimer > 0) {
        const remaining = Math.max(0, _alertFailDuration - _alertHoldTimer);
        ctx.textAlign = 'right';
        ctx.fillText(`${remaining.toFixed(1)}s`, canvasW - pad, meterY - 1);
      }

      ctx.globalAlpha  = 1;
      ctx.shadowBlur   = 0;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign    = 'left';
      ctx.restore();
    }
  }

  // ── Mini-map ─────────────────────────────────────────────
  // Drawn in the bottom-right corner of the canvas (over the map area).
  // Shows the full level layout at reduced scale with the player's position.
  const MINIMAP_MAX  = 180; // max dimension in pixels
  const MINIMAP_PAD  = 12;  // padding from canvas edge
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

    const tW  = mmW / cols;
    const tH  = mmH / rows;
    const mmX = canvasW - mmW - MINIMAP_PAD;
    const mmY = canvasH - mmH - MINIMAP_PAD;

    // Theme accent for minimap border/label
    const accent = _theme ? _theme.accentColor : '#00ffcc';

    ctx.save();

    // Background panel with glow border
    ctx.shadowBlur  = 8;
    ctx.shadowColor = accent;
    ctx.fillStyle   = 'rgba(3,3,16,0.88)';
    ctx.strokeStyle = `${accent}80`;
    ctx.lineWidth   = 1.5;
    ctx.fillRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8);
    ctx.strokeRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8);
    ctx.shadowBlur  = 0;

    // Label
    ctx.font          = '11px Courier New';
    ctx.fillStyle     = `${accent}aa`;
    ctx.textAlign     = 'left';
    ctx.textBaseline  = 'alphabetic';
    ctx.fillText('MAP', mmX - 3, mmY - 6);

    // Draw tiles — use theme floor/wall colours when available
    const T  = Tilemap.TILE;
    const fc = _theme ? _theme.floorColor : '#141428';
    const wc = _theme ? _theme.wallColor  : '#1a1a3a';
    // Brightened versions for the minimap
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = Tilemap.get(c, r);
        const tx   = mmX + c * tW;
        const ty   = mmY + r * tH;
        const tw   = Math.max(1, tW);
        const th   = Math.max(1, tH);

        // In fog mode, unexplored tiles appear as solid black on the minimap
        if (!FogManager.isExplored(c, r)) {
          ctx.fillStyle = 'rgba(0,0,0,0.95)';
          ctx.fillRect(tx, ty, tw, th);
          continue;
        }

        if (tile === T.WALL) {
          ctx.fillStyle = wc;
        } else if (tile === T.FLOOR || tile === T.DOOR_OPEN) {
          ctx.fillStyle = fc;
        } else if (tile === T.DOOR) {
          ctx.fillStyle = '#cc8800';
        } else if (tile === T.DOOR_RED) {
          ctx.fillStyle = '#cc2233';
        } else if (tile === T.DOOR_BLUE) {
          ctx.fillStyle = '#2255cc';
        } else if (tile === T.DOOR_GREEN) {
          ctx.fillStyle = '#226633';
        } else if (tile === T.KEY) {
          ctx.fillStyle = debugMode ? '#ffee00' : fc;
        } else if (tile === T.KEY_RED) {
          ctx.fillStyle = debugMode ? '#ff4455' : fc;
        } else if (tile === T.KEY_BLUE) {
          ctx.fillStyle = debugMode ? '#4488ff' : fc;
        } else if (tile === T.KEY_GREEN) {
          ctx.fillStyle = debugMode ? '#44ff88' : fc;
        } else if (tile === T.EXIT) {
          ctx.fillStyle = accent;
        } else if (tile === T.AMMO) {
          ctx.fillStyle = debugMode ? '#00ff88' : fc;
        } else {
          ctx.fillStyle = fc;
        }
        ctx.fillRect(tx, ty, tw, th);
      }
    }

    // Player dot — pulsing white circle
    const dotR  = Math.max(2, Math.min(tW, tH) * 1.8);
    const pulse = (Math.sin(_minimapPulse * 5) + 1) / 2;
    const dotX  = mmX + (playerCol + 0.5) * tW;
    const dotY  = mmY + (playerRow + 0.5) * tH;

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

  // ── Alert meter ──────────────────────────────────────────
  const ALERT_THRESHOLD = 0.85;
  let _alertLevel        = 0;
  let _alertHoldTimer    = 0;
  let _alertFailDuration = 3.0;
  let _alertPulse        = 0;

  function setAlertLevel(level, holdTimer, failDuration) {
    _alertLevel        = Utils.clamp(level, 0, 1);
    _alertHoldTimer    = holdTimer;
    _alertFailDuration = failDuration;
  }

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
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 12 + pulse * 12;
    ctx.shadowColor = '#ff0000';
    ctx.fillStyle = '#ff2244';
    ctx.fillText('⚠  DANGER  ⚠', w / 2, 80);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Alert-level critical warning ─────────────────────────
  // Shown when the global alert level has climbed above ALERT_THRESHOLD.
  // Displays in orange (distinct from the red proximity-danger warning) with
  // a live countdown when the fail timer is running.
  function drawAlertWarning(ctx, w, h) {
    if (_alertLevel < ALERT_THRESHOLD) return;

    const fadeIn = Utils.clamp((_alertLevel - ALERT_THRESHOLD) / (1 - ALERT_THRESHOLD), 0, 1);
    const pulse  = (Math.sin(_alertPulse * 10) + 1) / 2;
    const alpha  = fadeIn * (0.6 + pulse * 0.4);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur  = 14 + pulse * 14;
    ctx.shadowColor = '#ff4400';
    ctx.fillStyle   = '#ff6600';

    if (_alertHoldTimer > 0) {
      const remaining = Math.max(0, _alertFailDuration - _alertHoldTimer);
      ctx.fillText(`⚠  ALERT CRITICAL — ${remaining.toFixed(1)}s  ⚠`, w / 2, 104);
    } else {
      ctx.fillText('⚠  ALERT CRITICAL  ⚠', w / 2, 104);
    }

    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  return {
    showStart, showLevelComplete, showGameOver, showVictory, hide,
    showInfo, hideInfo, isInfoVisible,
    setTheme, setHUD, flashKeyCollect, flashAmmoCollect, setVignette, setDanger,
    setAlertLevel, setFogMode, setGhostMode, setDebugMode,
    update, drawHUD, drawScanlines, drawVignette, drawDangerWarning, drawAlertWarning,
    drawMinimap, updateMinimap
  };
})();
