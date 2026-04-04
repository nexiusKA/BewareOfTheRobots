// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '17',
    sha:    'c8c5fb377489e04d79deafa446d83653f883501d',
    branch: 'main',
    date:   '2026-04-04',
  };
})();
