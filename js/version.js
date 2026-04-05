// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '21',
    sha:    'c81dbff6bf9c3c4fed8a316085e49e424c24201a',
    branch: 'main',
    date:   '2026-04-05',
  };
})();
