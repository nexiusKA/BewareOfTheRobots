// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '33',
    sha:    'ce62860474dd7646a10729ac4b83e82aa5d19852',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
