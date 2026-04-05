// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '42',
    sha:    'a2993c91e4280ef5308a28eb0041e92c3036a3d9',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
