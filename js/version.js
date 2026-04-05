// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '20',
    sha:    '935ca268c218b26ca7b1516c160949659dc01efd',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
