// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '12',
    sha:    '841c53fbf4f3f20f181c762a9dd713c2ae3a8783',
    branch: 'main',
    date:   '2026-04-04',
  };
})();
