// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '11',
    sha:    '43e1b95391a3f4b78591c31a628024784e8ad2eb',
    branch: 'main',
    date:   '2026-04-04',
  };
})();
