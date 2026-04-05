// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '37',
    sha:    '1254d9f8d7d8795417e01375317b1b76c0b9992a',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
