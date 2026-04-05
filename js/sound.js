// ── sound.js ────────────────────────────────────────────────
// Procedural sound effects via Web Audio API.
// All sounds are synthesised on-the-fly — no audio files required.

const Sound = (() => {

  let _ctx   = null;
  let _muted = false;

  // Lazily create AudioContext on first call (requires user gesture)
  function _getCtx() {
    if (!_ctx) {
      try {
        _ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (_ctx.state === 'suspended') {
      _ctx.resume().catch(() => {});
    }
    return _ctx;
  }

  // Play a single oscillator tone with exponential decay
  function _tone(freq, type, duration, vol, startTime) {
    const ctx = _getCtx();
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  // Play a white-noise burst (for explosions)
  function _noise(duration, vol, startTime) {
    const ctx = _getCtx();
    if (!ctx) return;
    const bufLen = Math.ceil(ctx.sampleRate * duration);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }

  // ── Mute toggle ───────────────────────────────────────────
  function toggleMute() {
    _muted = !_muted;
    Music.onMuteChange(_muted);
  }
  function isMuted()    { return _muted; }

  // ── Public sounds ─────────────────────────────────────────

  // Ascending 3-note chime (C5 → E5 → G5)
  function keyPickup() {
    if (_muted) return;
    const ctx = _getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    _tone(523, 'sine', 0.30, 0.35, now);
    _tone(659, 'sine', 0.28, 0.30, now + 0.07);
    _tone(784, 'sine', 0.35, 0.38, now + 0.14);
  }

  // Short low thud with slight pitch drop
  function bombPlace() {
    if (_muted) return;
    const ctx = _getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.26);
    // Sub-bass punch
    _tone(60, 'sine', 0.18, 0.5, now);
  }

  // Explosion: noise burst + low boom + impact hit
  function bombDetonate() {
    if (_muted) return;
    const ctx = _getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // White-noise shockwave
    _noise(0.55, 0.9, now);

    // Low boom oscillator
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    gain.gain.setValueAtTime(0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.start(now);
    osc.stop(now + 0.46);

    // High-frequency crack
    _tone(1200, 'square', 0.08, 0.25, now);
  }

  // Short soft electronic tap played on every successful tile move
  function move() {
    if (_muted) return;
    const ctx = _getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    _tone(520, 'triangle', 0.07, 0.06, now);
    _tone(700, 'sine',     0.05, 0.04, now + 0.02);
  }

  // Mechanical lock-click followed by a bright unlock chime
  function doorOpen() {
    if (_muted) return;
    const ctx = _getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Three quick mechanical clicks
    _tone(220, 'square', 0.04, 0.30, now);
    _tone(280, 'square', 0.04, 0.28, now + 0.05);
    _tone(350, 'square', 0.05, 0.25, now + 0.10);
    // Bright metallic unlock shimmer
    _tone(900,  'sine', 0.20, 0.40, now + 0.15);
    _tone(1350, 'sine', 0.18, 0.30, now + 0.19);
    _tone(1800, 'sine', 0.14, 0.20, now + 0.23);
  }

  // Short soft click for UI button presses
  function tap() {
    if (_muted) return;
    const ctx = _getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    _tone(900, 'sine', 0.05, 0.07, now);
  }

  // Ascending four-note fanfare for level/sector complete
  function levelComplete() {
    if (_muted) return;
    const ctx = _getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    _tone(523,  'sine', 0.25, 0.32, now);         // C5
    _tone(659,  'sine', 0.25, 0.32, now + 0.12);  // E5
    _tone(784,  'sine', 0.25, 0.32, now + 0.24);  // G5
    _tone(1047, 'sine', 0.35, 0.38, now + 0.36);  // C6
  }

  // Short alarm pulse for trap activation and enemy alert transitions
  function alarm() {
    if (_muted) return;
    const ctx = _getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    _tone(880, 'square', 0.10, 0.18, now);
    _tone(660, 'square', 0.10, 0.15, now + 0.15);
    _tone(880, 'square', 0.08, 0.12, now + 0.30);
  }

  return { keyPickup, bombPlace, bombDetonate, move, doorOpen, tap, levelComplete, alarm, toggleMute, isMuted };
})();

// ── Music ────────────────────────────────────────────────────
// Plays a random level soundtrack (levelsounds/level1-10.mp3)
// at background volume (30%).  Stops cleanly between levels.
const Music = (() => {
  const TRACK_COUNT = 10;
  const VOLUME      = 0.3;

  let _audio   = null;
  let _muted   = false;

  function play() {
    stop();
    const track = Math.floor(Math.random() * TRACK_COUNT) + 1;
    _audio = new Audio(`levelsounds/level${track}.mp3`);
    _audio.loop   = true;
    _audio.volume = _muted ? 0 : VOLUME;
    _audio.onerror = () => { _audio = null; };
    _audio.play().catch(() => {});
  }

  function stop() {
    if (_audio) {
      _audio.pause();
      _audio.src = '';
      _audio = null;
    }
  }

  function onMuteChange(muted) {
    _muted = muted;
    if (_audio) {
      _audio.volume = muted ? 0 : VOLUME;
    }
  }

  return { play, stop, onMuteChange };
})();
