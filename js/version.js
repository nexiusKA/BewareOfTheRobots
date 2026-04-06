// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '46',
    sha:    '68d5474212184d46809e17ac9d158729921223d3',
    branch: 'main',
    date:   '2026-04-06',
  };
})();
