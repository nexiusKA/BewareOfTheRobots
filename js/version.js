// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '43',
    sha:    '3518b1e2de54d1583985c39bc59e535266dac927',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
