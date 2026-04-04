// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '18',
    sha:    '7298c222637222ea3a1a286129fecdeeca166743',
    branch: 'main',
    date:   '2026-04-04',
  };
})();
