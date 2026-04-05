// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '19',
    sha:    '3bc70b6af432faf652069d9a7dc4183aaa358848',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
