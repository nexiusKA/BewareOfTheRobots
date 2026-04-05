// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '39',
    sha:    'ca82468fad82cec839dcf352d3c2cc474b917860',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
