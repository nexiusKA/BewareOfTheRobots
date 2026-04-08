// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '49',
    sha:    'f637469e579d89027de7347da5083e4579b4c012',
    branch: 'main',
    date:   '2026-04-08',
  };
})();
