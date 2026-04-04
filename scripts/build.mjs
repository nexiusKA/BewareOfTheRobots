// ── build.mjs ────────────────────────────────────────────────
// Generates js/version.js with current build metadata.
// Usage: node scripts/build.mjs
//
// CI env vars (optional):
//   BUILD_NUMBER  — overrides the auto-incremented build number
//   COMMIT_SHA / GITHUB_SHA  — git commit hash
//   BRANCH / GITHUB_REF_NAME — branch name
//   BUILD_DATE   — ISO date string (YYYY-MM-DD); defaults to today

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const buildNumberPath = path.join(__dirname, "build-number.json");
const versionJsPath = path.join(rootDir, "js", "version.js");

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
  await writeFile(
    buildNumberPath,
    `${JSON.stringify({ buildNumber: next }, null, 2)}\n`,
    "utf8"
  );
  return next;
}

async function run() {
  let buildNumber;
  if (process.env.BUILD_NUMBER) {
    buildNumber = Number(process.env.BUILD_NUMBER);
  } else {
    buildNumber = await readAndBumpBuildNumber();
  }

  const sha =
    process.env.COMMIT_SHA || process.env.GITHUB_SHA || "local";
  const branch =
    process.env.BRANCH || process.env.GITHUB_REF_NAME || "local";
  const date =
    process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);

  const content =
    `// ── version.js ───────────────────────────────────────────────\n` +
    `// Build metadata — overwritten by CI on each release build.\n` +
    `// In local dev this file is used as-is (all fields read "dev").\n` +
    `const BUILD_INFO = (function () {\n` +
    `  return {\n` +
    `    run:    '${buildNumber}',\n` +
    `    sha:    '${sha}',\n` +
    `    branch: '${branch}',\n` +
    `    date:   '${date}',\n` +
    `  };\n` +
    `})();\n`;

  await writeFile(versionJsPath, content, "utf8");
  console.log(
    `version.js written — build #${buildNumber}, sha ${sha.slice(0, 7)}, branch ${branch}, date ${date}`
  );
}

run().catch((err) => {
  console.error("Build failed:", err);
  process.exitCode = 1;
});

