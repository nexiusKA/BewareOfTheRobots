// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '35',
    sha:    'c64d9f43cb3977f59e3481b1d1d6ff70869970d3',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
