// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '13',
    sha:    'a1b2c4c288ecab30f287e76f211ea8d240cc97ff',
    branch: 'main',
    date:   '2026-04-04',
  };
})();
