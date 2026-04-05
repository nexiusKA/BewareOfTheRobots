// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '28',
    sha:    'eab15d9f7e979df31ce3671785299d707763c903',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
