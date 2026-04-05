// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '27',
    sha:    '3246fcbc1968bdd8c8e6151555321b4e3bc05dcb',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
