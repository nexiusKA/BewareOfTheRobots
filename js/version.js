// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '30',
    sha:    'cb847a35aa0214e874d3e0298ed8e9dde2a10da4',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
