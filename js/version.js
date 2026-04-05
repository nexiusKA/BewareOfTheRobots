// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '38',
    sha:    '5bf4bd28d26e59d768525b40499256e623598709',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
