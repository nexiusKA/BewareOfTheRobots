// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '47',
    sha:    '844bed47422753cf0b363f010c8280b298243171',
    branch: 'main',
    date:   '2026-04-07',
  };
})();
