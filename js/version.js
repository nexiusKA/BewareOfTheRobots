// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '34',
    sha:    '58e25b6b41c0ea13f9243014f77092fdb0048c9a',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
