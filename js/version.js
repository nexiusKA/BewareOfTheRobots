// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '24',
    sha:    '84b401967230c58898c4726f1425a3c73c20a14c',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
