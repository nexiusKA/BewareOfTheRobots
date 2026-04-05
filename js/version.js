// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '29',
    sha:    '367a344f891e3994395cb6fb54a53b9633c9e8b0',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
