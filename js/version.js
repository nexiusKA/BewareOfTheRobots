// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '9',
    sha:    '03d2b44f2173c676cd374d27248fcddc0c80c2fd',
    branch: 'main',
    date:   '2026-04-04',
  };
})();
