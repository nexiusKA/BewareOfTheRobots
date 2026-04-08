// ── version.js ───────────────────────────────────────────────
// Build metadata — overwritten by CI on each release build.
// In local dev this file is used as-is (all fields read "dev").
const BUILD_INFO = (function () {
  return {
    run:    '51',
    sha:    'ef940e943c86051e43a83b2cbfd05196ec2fd2a5',
    branch: 'main',
    date:   '2026-04-08',
  };
})();
