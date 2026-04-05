// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '32',
    sha:    '608f7a7966dcb8f2b6bd1cb836f122ee13498a23',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
