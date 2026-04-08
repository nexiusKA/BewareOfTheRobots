// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '50',
    sha:    '7f9d043102109b4835b15a487902d6e443353691',
    branch: 'main',
    date:   '2026-04-08',
  };
})();
