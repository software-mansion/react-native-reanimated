const fs = require('node:fs');
const path = require('node:path');

const SECTIONS = { docs: 'Documentation', blog: 'Blog', examples: 'Examples' };

// Superseded versions are disallowed at the origin, so they stay out of here too.
const SUPERSEDED = /^docs\/[123]\.x\//;

const decode = (value) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .trim();

const metaOf = (html, name) =>
  new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]*)"`, 'i').exec(
    html,
  )?.[1] ?? '';

function describe(html, siteTitle) {
  const raw = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '';
  const title = decode(raw).replace(new RegExp(`\\s*\\|\\s*${siteTitle}$`), '');
  return { title, description: decode(metaOf(html, 'description')) };
}

function buildLlmsTxt({ siteConfig, routesPaths, readPage }) {
  const { baseUrl, title, tagline, url } = siteConfig;
  const grouped = new Map();

  for (const route of routesPaths) {
    if (!route.startsWith(baseUrl) || route.endsWith('404.html')) continue;

    const relative = route.slice(baseUrl.length);
    if (SUPERSEDED.test(relative)) continue;

    const html = readPage(relative);
    if (!html) continue;

    const page = describe(html, title);
    if (!page.title) continue;

    const section = SECTIONS[relative.split('/')[0]] ?? 'Pages';
    const line = `- [${page.title}](${url}${route})${page.description ? `: ${page.description}` : ''}`;

    if (!grouped.has(section)) grouped.set(section, []);
    grouped.get(section).push(line);
  }

  const lines = [`# ${title}`];
  if (tagline) lines.push('', `> ${tagline}`);

  for (const section of ['Documentation', 'Examples', 'Blog', 'Pages']) {
    const entries = grouped.get(section);
    if (!entries?.length) continue;
    lines.push('', `## ${section}`, '', ...entries.sort());
  }

  lines.push('', '## About', '', `- [Software Mansion](https://swmansion.com): maintainer of ${title}`, '');

  return lines.join('\n');
}

module.exports = function llmsTxtPlugin() {
  return {
    name: 'llms-txt',
    async postBuild({ siteConfig, routesPaths, outDir }) {
      const readPage = (relative) => {
        const file = path.join(outDir, relative, 'index.html');
        return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      };

      await fs.promises.writeFile(
        path.join(outDir, 'llms.txt'),
        buildLlmsTxt({ siteConfig, routesPaths, readPage }),
        'utf8',
      );
    },
  };
};

module.exports.buildLlmsTxt = buildLlmsTxt;
