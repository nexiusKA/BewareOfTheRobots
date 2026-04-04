// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '10',
    sha:    '2c69980c5428bbc77a6b43224058ce1c7c72f88d',
    branch: 'main',
    date:   '2026-04-04',
  };
})();
