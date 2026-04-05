// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '36',
    sha:    'f1fec8de8e4645c4c2a527128a5dac1cb932539c',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
