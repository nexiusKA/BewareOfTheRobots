// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '22',
    sha:    'b00182a84354de8c728c513b997aa0cdf78663a0',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
