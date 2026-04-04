// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '14',
    sha:    '75f294db893def7ef9aa96dfee9aaa624c092d43',
    branch: 'main',
    date:   '2026-04-04',
  };
})();
