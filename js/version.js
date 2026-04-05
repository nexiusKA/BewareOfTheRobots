// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '31',
    sha:    '6048e04767f70c6f2030b0288b89d63e8cebc97b',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
