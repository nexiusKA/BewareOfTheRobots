// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '45',
    sha:    '26ac5dbe1840a9d9cd411c14f10a891c8e54347f',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
