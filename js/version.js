// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '40',
    sha:    'ebe685312a6f3c58871d43ad8fbb2918ca695004',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
