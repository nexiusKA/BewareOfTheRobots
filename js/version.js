// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '23',
    sha:    '2bf69cca1109572f5ec91a0695eaa0779f36749e',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
