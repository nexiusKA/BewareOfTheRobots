// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '26',
    sha:    'cfa4b216b012bc8083b83da6db435cd60261b6fb',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
