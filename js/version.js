// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '41',
    sha:    '759f65098a2612a9450d58b63961d5113064d9fa',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
