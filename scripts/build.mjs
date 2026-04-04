import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, transform } from "esbuild";
import { minify } from "html-minifier-terser";
import { skillPerkCatalog } from "../src/systems/perks/skillPerkCatalog.js";
import {
  escapeHtml,
  buildStaticPageNav,
  buildStaticPageHeader,
  buildStaticPageFooter,
  buildPerkLibraryParts,
} from "./build-helpers.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const distDir = path.join(rootDir, "dist");
const templateHtmlPath = path.join(rootDir, "src", "index.template.html");
const perkLibraryTemplateHtmlPath = path.join(rootDir, "src", "perk-library.template.html");
const sourceCssPath = path.join(rootDir, "src", "style.css");
const staticPagesCssPath = path.join(rootDir, "src", "static-pages.css");
const sourceJsEntryPath = path.join(rootDir, "src", "main.js");
const buildNumberPath = path.join(rootDir, "scripts", "build-number.json");
const outputGameSourceHtmlPath = path.join(distDir, "game.source.html");
const outputGameHtmlPath = path.join(distDir, "game.html");
const outputPerkLibrarySourceHtmlPath = path.join(distDir, "perk-library.source.html");
const outputPerkLibraryHtmlPath = path.join(distDir, "perk-library.html");
const outputStaticPagesCssPath = path.join(distDir, "static-pages.css");
const outputLandingHtmlPath = path.join(distDir, "index.html");
const legacyPerksDirPath = path.join(distDir, "perks");



function buildLandingHtml(appVersion, gitInfo = {}) {
  const { commitSha = "", branch = "", buildDate = "" } = gitInfo;
  const shortSha = commitSha ? commitSha.slice(0, 7) : "";
  const commitLink = commitSha
    ? `<a href="https://github.com/nexiusKA/Catch-the-Chaos/commit/${escapeHtml(commitSha)}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortSha)}</a>`
    : "—";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Catch the Chaos!</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0a0a1a;
        font-family: 'Arial Black', Arial, sans-serif;
        color: #fff;
        overflow: hidden;
      }
      .stars {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
      }
      .stars span {
        position: absolute;
        border-radius: 50%;
        background: #fff;
        animation: twinkle var(--d, 3s) ease-in-out infinite alternate;
        opacity: 0.4;
      }
      @keyframes twinkle { to { opacity: 0.05; } }
      .panel {
        position: relative;
        z-index: 1;
        width: min(480px, calc(100vw - 28px));
        background: rgba(10, 10, 30, 0.92);
        border: 3px solid #ff6600;
        border-radius: 14px;
        padding: 36px 32px 30px;
        text-align: center;
        box-shadow: 0 0 40px rgba(255,102,0,.45), 0 0 90px rgba(255,102,0,.18);
      }
      h1 {
        font-size: clamp(2rem, 8vw, 2.8rem);
        line-height: 1.15;
        margin-bottom: 6px;
        background: linear-gradient(180deg, #FFD700 0%, #FF6600 50%, #FF0066 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 0 10px rgba(255,102,0,.7));
      }
      .tagline {
        color: #aaffaa;
        font-family: Arial, sans-serif;
        font-size: 0.95rem;
        margin-bottom: 28px;
      }
      .links { display: grid; gap: 12px; }
      .btn-play {
        display: block;
        text-decoration: none;
        color: #fff;
        font-family: 'Arial Black', Arial, sans-serif;
        font-size: 1.15rem;
        letter-spacing: 0.05em;
        background: rgba(255,102,0,.2);
        border: 3px solid #ff6600;
        border-radius: 10px;
        padding: 14px 20px;
        transition: background .15s, transform .1s;
        box-shadow: 0 0 18px rgba(255,102,0,.35);
        animation: pulse-btn 2.2s ease-in-out infinite;
      }
      .btn-play:hover {
        background: rgba(255,102,0,.42);
        transform: scale(1.03);
      }
      @keyframes pulse-btn {
        0%, 100% { box-shadow: 0 0 18px rgba(255,102,0,.35); }
        50%       { box-shadow: 0 0 32px rgba(255,102,0,.7); }
      }
      .btn-secondary {
        display: block;
        text-decoration: none;
        color: #aaa;
        font-family: Arial, sans-serif;
        font-size: 0.88rem;
        border: 1px solid rgba(255,102,0,.3);
        border-radius: 8px;
        padding: 10px 14px;
        transition: border-color .15s, color .15s;
      }
      .btn-secondary:hover { border-color: #ff6600; color: #ff9944; }
      .version {
        margin-top: 14px;
        font-family: Arial, sans-serif;
        font-size: 0.72rem;
        color: rgba(255,255,255,.3);
      }
      .git-info {
        margin-top: 14px;
        border: 1px solid rgba(255,102,0,.25);
        border-radius: 8px;
        padding: 12px 14px;
        text-align: left;
        font-family: Arial, sans-serif;
        font-size: 0.78rem;
        color: #aaa;
      }
      .git-info > summary {
        cursor: pointer;
        color: rgba(255,200,100,.7);
        font-size: 0.8rem;
        letter-spacing: 0.04em;
        user-select: none;
        list-style: none;
      }
      .git-info > summary::-webkit-details-marker { display: none; }
      .git-info > summary::before { content: "▶ "; font-size: 0.65rem; }
      .git-info[open] > summary::before { content: "▼ "; }
      .git-info-grid {
        margin-top: 10px;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 4px 10px;
        word-break: break-all;
      }
      .git-info-grid dt { color: rgba(255,200,100,.6); white-space: nowrap; }
      .git-info-grid dd { margin: 0; }
      .git-info-grid a { color: #ff9944; text-decoration: none; }
      .git-info-grid a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="stars" id="stars"></div>
    <main class="panel">
      <h1>CATCH THE<br>CHAOS! 💨</h1>
      <p class="tagline">Catch the blobs · Dodge the spikes!</p>
      <div class="links">
        <a href="./game.html" class="btn-play">▶ &nbsp;PLAY NOW</a>
        <a href="./perk-library.html" class="btn-secondary">Perk Library</a>
        <a href="https://github.com/nexiusKA/Catch-the-Chaos" class="btn-secondary" target="_blank" rel="noopener noreferrer">GitHub Repository ↗</a>
      </div>
      <div class="version">Build version ${escapeHtml(appVersion)}</div>
      <details class="git-info">
        <summary>Git Info</summary>
        <dl class="git-info-grid">
          <dt>Version</dt><dd>${escapeHtml(appVersion)}</dd>
          <dt>Commit</dt><dd>${commitLink}</dd>
          <dt>Branch</dt><dd>${escapeHtml(branch) || "—"}</dd>
          <dt>Build Date</dt><dd>${escapeHtml(buildDate) || "—"}</dd>
        </dl>
      </details>
    </main>
    <script>
      const c = document.getElementById('stars');
      for (let i = 0; i < 80; i++) {
        const s = document.createElement('span');
        const sz = Math.random() * 2.5 + 0.5;
        s.style.cssText = \`width:\${sz}px;height:\${sz}px;top:\${Math.random()*100}%;left:\${Math.random()*100}%;--d:\${(Math.random()*3+1.5).toFixed(1)}s;animation-delay:\${(Math.random()*3).toFixed(1)}s\`;
        c.appendChild(s);
      }
    </script>
  </body>
</html>`;
}

async function readAndBumpBuildNumber() {
  let current = 0;

  try {
    const raw = await readFile(buildNumberPath, "utf8");
    const parsed = JSON.parse(raw);
    const value = Number(parsed?.buildNumber);
    if (Number.isFinite(value) && value >= 0) {
      current = Math.floor(value);
    }
  } catch {
    current = 0;
  }

  const next = current + 1;
  await writeFile(buildNumberPath, `${JSON.stringify({ buildNumber: next }, null, 2)}\n`, "utf8");
  return next;
}

async function runBuild() {
  // CI can pass BUILD_NUMBER env var (e.g. github.run_number) to avoid
  // mutating build-number.json during automated builds.
  let buildNumber;
  if (process.env.BUILD_NUMBER) {
    buildNumber = Number(process.env.BUILD_NUMBER);
  } else {
    buildNumber = await readAndBumpBuildNumber();
  }
  const appVersion = `0.${buildNumber}`;
  const gitInfo = {
    commitSha: process.env.COMMIT_SHA || process.env.GITHUB_SHA || "",
    branch: process.env.BRANCH || process.env.GITHUB_REF_NAME || "",
    buildDate: new Date().toISOString().slice(0, 10),
  };
  const [templateHtml, perkLibraryTemplateHtml, cssContent, staticPagesCssContent] = await Promise.all([
    readFile(templateHtmlPath, "utf8"),
    readFile(perkLibraryTemplateHtmlPath, "utf8"),
    readFile(sourceCssPath, "utf8"),
    readFile(staticPagesCssPath, "utf8"),
  ]);

  const jsBundleResult = await build({
    entryPoints: [sourceJsEntryPath],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2020",
    legalComments: "none",
    minify: false,
    define: { __APP_VERSION__: JSON.stringify(appVersion) },
  });

  const jsBundle = jsBundleResult.outputFiles[0].text;

  const minifiedCssResult = await transform(cssContent, {
    loader: "css",
    minify: true,
    legalComments: "none",
  });

  const minifiedStaticPagesCssResult = await transform(staticPagesCssContent, {
    loader: "css",
    minify: true,
    legalComments: "none",
  });

  const composedHtml = templateHtml
    .replace(/__APP_VERSION__/g, appVersion)
    .replace("__INLINE_CSS__", minifiedCssResult.code)
    .replace("<!-- __INLINE_SCRIPT__ -->", `  <script>\n${jsBundle}\n  </script>`);

  const minifiedHtml = await minify(composedHtml, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeOptionalTags: false,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    useShortDoctype: true,
    keepClosingSlash: true,
  });

  await mkdir(distDir, { recursive: true });
  await rm(legacyPerksDirPath, { recursive: true, force: true });

  const perkLibraryParts = buildPerkLibraryParts(skillPerkCatalog);
  const perksSourceHtml = perkLibraryTemplateHtml
    .replace(/__APP_VERSION__/g, appVersion)
    .replace(
      "__STATIC_SITE_HEADER__",
      buildStaticPageHeader({
        title: "Perk Library",
        subtitle: "Automatically generated from perk metadata.",
        currentPage: "perk-library",
      })
    )
    .replace("__PERK_TAG_NAV__", perkLibraryParts.navItems)
    .replace("__PERK_LIBRARY_SECTIONS__", perkLibraryParts.sections)
    .replace("__STATIC_SITE_FOOTER__", buildStaticPageFooter(appVersion));
  const perksHtml = await minify(perksSourceHtml, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeOptionalTags: false,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    useShortDoctype: true,
    keepClosingSlash: true,
  });

  const landingSourceHtml = buildLandingHtml(appVersion, gitInfo);
  const landingHtml = await minify(landingSourceHtml, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeOptionalTags: false,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    useShortDoctype: true,
    keepClosingSlash: true,
  });

  await writeFile(outputGameSourceHtmlPath, composedHtml, "utf8");
  await writeFile(outputGameHtmlPath, minifiedHtml, "utf8");
  await writeFile(outputPerkLibrarySourceHtmlPath, perksSourceHtml, "utf8");
  await writeFile(outputPerkLibraryHtmlPath, perksHtml, "utf8");
  await writeFile(outputStaticPagesCssPath, minifiedStaticPagesCssResult.code, "utf8");
  await writeFile(outputLandingHtmlPath, landingHtml, "utf8");

  console.log(
    `Build complete: dist/index.html + dist/game.html + dist/perk-library.html (version ${appVersion})`
  );
}

runBuild().catch((error) => {
  console.error("Build failed:", error);
  process.exitCode = 1;
});
