// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '25',
    sha:    '433b229879943945514f75b79a902cbb8decddbc',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
