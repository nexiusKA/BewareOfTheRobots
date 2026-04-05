// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '44',
    sha:    '3bb35b39077ccd1ee46fe541de8c64e57a72e168',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
