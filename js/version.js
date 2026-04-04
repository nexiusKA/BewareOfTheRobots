// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '15',
    sha:    '3952eb240cdc1bcedfec028f813153b3ecd6638e',
    branch: 'main',
    date:   '2026-04-04',
  };
})();
