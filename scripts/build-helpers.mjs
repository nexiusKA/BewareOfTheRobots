/**
 * Pure build-time helper functions shared between the build script and
 * regression tests. All functions are side-effect-free.
 */

export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** @type {Array<{href: string, label: string, key: string}>} */
export const STATIC_PAGE_LINKS = [
  { href: "./game.html", label: "Play Game", key: "game" },
  { href: "./perk-library.html", label: "Perk Library", key: "perk-library" },
];

export function buildStaticPageNav(currentPage) {
  return STATIC_PAGE_LINKS
    .map((link) => {
      const currentAttr = link.key === currentPage ? ' aria-current="page"' : "";
      return `<a href="${link.href}"${currentAttr}>${link.label}</a>`;
    })
    .join("\n");
}

export function buildStaticPageHeader({ title, subtitle, currentPage }) {
  return `<section class="hero">
      <h1>${escapeHtml(title)}</h1>
      <p class="sub">${escapeHtml(subtitle)}</p>
      <nav class="top-links" aria-label="Static page navigation">
${buildStaticPageNav(currentPage)}
      </nav>
    </section>`;
}

export function buildStaticPageFooter(appVersion) {
  return `<footer>
      Generated from game build ${escapeHtml(appVersion)}. <a href="https://github.com/nexiusKA/Catch-the-Chaos">GitHub Repository</a>
    </footer>`;
}

/**
 * Groups and sorts perks from the provided catalog by their tags.
 *
 * @param {Array<{id: string, name: string, description: string, tags: string[]}>} catalog
 * @returns {{ navItems: string, sections: string }}
 */
export function buildPerkLibraryParts(catalog) {
  const sorted = [...catalog].sort((a, b) => a.name.localeCompare(b.name));
  const groups = new Map();

  for (let i = 0; i < sorted.length; i += 1) {
    const perk = sorted[i];
    const tags = Array.isArray(perk.tags) ? perk.tags : ["other"];
    for (let t = 0; t < tags.length; t += 1) {
      const tag = tags[t];
      if (!groups.has(tag)) {
        groups.set(tag, []);
      }
      groups.get(tag).push(perk);
    }
  }

  const navItems = [...groups.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((tag) => `<a href="#tag-${escapeHtml(tag)}">${escapeHtml(tag)}</a>`)
    .join("\n");

  const sections = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, perks]) => {
      const cards = perks
        .map(
          (perk) => `
<article class="perk-card">
  <h3>${escapeHtml(perk.name)}</h3>
  <p>${escapeHtml(perk.description)}</p>
  <div class="meta">
    <span class="perk-id">${escapeHtml(perk.id)}</span>
    <span class="perk-tags">${perk.tags.map((entry) => `#${escapeHtml(entry)}`).join(" ")}</span>
  </div>
</article>`
        )
        .join("\n");

      return `
<section id="tag-${escapeHtml(tag)}" class="tag-section">
  <h2>${escapeHtml(tag)} <span>(${perks.length})</span></h2>
  <div class="perk-grid">
${cards}
  </div>
</section>`;
    })
    .join("\n");

  return { navItems, sections };
}
