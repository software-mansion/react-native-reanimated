import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import {
  findLastVersion,
  PACKAGES,
} from './validate-docs-released-versions.mts';

export type Redirect = { from: string; to: string };
export type Files = {
  read: (path: string) => string | undefined;
  list: (dir: string) => string[];
};
type Sidebars = Record<string, unknown>;
type FrontMatter = Record<string, string>;
type Doc = { source: string; slug: string };

export const PENDING_REDIRECTS = 'pending-redirects.json';
const ROUTE_BASE_PATH = '/docs';
const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const RELEASE_GUIDE = 'packages/react-native-reanimated/RELEASE.md';
const YAML_ESCAPES: Record<string, string> = {
  '0': '\0',
  a: '\x07',
  b: '\b',
  t: '\t',
  '\t': '\t',
  n: '\n',
  v: '\v',
  f: '\f',
  r: '\r',
  e: '\x1b',
  ' ': ' ',
  '"': '"',
  '/': '/',
  '\\': '\\',
  N: '\x85',
  _: '\xa0',
  L: '\u2028',
  P: '\u2029',
};

function main() {
  const { values } = parseArgs({
    options: { root: { type: 'string', default: REPOSITORY_ROOT } },
  });

  const { problems, messages } = validate(createFiles(values.root));

  for (const message of messages) {
    console.log(message);
  }

  if (problems.length === 0) {
    return;
  }

  console.error(
    [
      '',
      ...problems.map((problem) => `- ${problem}`),
      '',
      `Keep old page URLs working as described in ${RELEASE_GUIDE}.`,
    ].join('\n')
  );
  process.exitCode = 1;
}

function createFiles(root: string): Files {
  return {
    read: (path) => {
      const fullPath = join(root, path);
      return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : undefined;
    },
    list: (dir) => {
      const fullPath = join(root, dir);
      if (!existsSync(fullPath)) {
        return [];
      }
      return readdirSync(fullPath, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) =>
          posix.relative(
            fullPath.split('\\').join('/'),
            join(entry.parentPath, entry.name).split('\\').join('/')
          )
        )
        .sort();
    },
  };
}

export function validate(files: Files) {
  const problems: string[] = [];
  const messages: string[] = [];

  for (const { docs } of PACKAGES) {
    const config = readRequired(files, `${docs}/docusaurus.config.js`);
    const versions = JSON.parse(
      readRequired(files, `${docs}/versions.json`)
    ) as string[];
    const lastVersion = findLastVersion(config) ?? versions[0] ?? 'current';
    if (lastVersion === 'current') {
      messages.push(`${docs}: has no released docs version, nothing to check.`);
      continue;
    }

    const released = listRoutes(
      files,
      `${docs}/versioned_docs/version-${lastVersion}`,
      readVersionedSidebars(
        files,
        `${docs}/versioned_sidebars/version-${lastVersion}-sidebars.json`
      )
    );
    const unreleased = listRoutes(
      files,
      `${docs}/docs`,
      evaluateSidebars(readRequired(files, `${docs}/sidebars.js`))
    );
    const pendingPath = `${docs}/${PENDING_REDIRECTS}`;
    const pending = parsePendingRedirects(
      readRequired(files, pendingPath),
      pendingPath
    );
    const configured = findConfigRedirects(config);
    const otherVersionPaths = [
      ...versions.filter((version) => version !== lastVersion),
      findCurrentVersionPath(config),
    ];
    const previousVersion = versions[versions.indexOf(lastVersion) + 1];
    const previous =
      previousVersion === undefined
        ? new Set<string>()
        : listRoutes(
            files,
            `${docs}/versioned_docs/version-${previousVersion}`,
            readVersionedSidebars(
              files,
              `${docs}/versioned_sidebars/version-${previousVersion}-sidebars.json`
            )
          );

    const siteProblems = findProblems({
      docs,
      lastVersion,
      released,
      unreleased,
      pending,
      configured,
      otherVersionPaths,
    });
    if (previousVersion !== undefined) {
      siteProblems.push(
        ...findPreviousVersionProblems({
          docs,
          previousVersion,
          lastVersion,
          previous,
          released,
          configured,
          otherVersionPaths,
        })
      );
    }
    problems.push(...siteProblems);

    if (siteProblems.length === 0) {
      messages.push(
        [
          `${docs}: each of the ${released.size} pages of ${lastVersion} has a page at the same path in Unreleased, one of the ${pending.length} redirects in ${pendingPath} or a redirect in docusaurus.config.js to an Unreleased page.`,
          ...(previousVersion === undefined
            ? []
            : [
                `Each of the ${previous.size} pages of ${previousVersion} has a page at the same path in ${lastVersion} or a redirect in docusaurus.config.js to a ${lastVersion} page.`,
              ]),
          `The redirects in docusaurus.config.js that point to ${lastVersion} pages point to existing pages.`,
        ].join(' ')
      );
    }
  }

  return { problems, messages };
}

export function findProblems({
  docs,
  lastVersion,
  released,
  unreleased,
  pending,
  configured,
  otherVersionPaths,
}: {
  docs: string;
  lastVersion: string;
  released: Set<string>;
  unreleased: Set<string>;
  pending: Redirect[];
  configured: Redirect[];
  otherVersionPaths: string[];
}) {
  const problems: string[] = [];
  const pendingPath = `${docs}/${PENDING_REDIRECTS}`;
  const configPath = `${docs}/docusaurus.config.js`;
  const pendingFrom = new Set<string>();
  const configuredTo = new Map(
    configured.map((redirect) => [normalizeRoute(redirect.from), redirect.to])
  );

  for (const redirect of pending) {
    const from = normalizeRoute(redirect.from);
    const to = toRoute(redirect.to);
    const entry = `${pendingPath}: the redirect from ${redirect.from} to ${redirect.to}`;

    if (pendingFrom.has(from)) {
      problems.push(`${entry} repeats the path ${redirect.from}. Remove one.`);
    }
    pendingFrom.add(from);

    if (configuredTo.has(from)) {
      problems.push(
        `${entry} is also in the redirects in ${configPath}. Remove it from ${PENDING_REDIRECTS}.`
      );
    }
    if (unreleased.has(from)) {
      problems.push(
        `${entry} is not necessary, because Unreleased has a page at ${redirect.from}. Remove it.`
      );
    } else if (!released.has(from)) {
      problems.push(
        `${entry} starts at a path that is not a page of ${lastVersion}. Fix the path or remove the redirect. If you have just cut the docs version, move the redirect to the redirects in ${configPath}.`
      );
    }
    if (!unreleased.has(to)) {
      problems.push(
        `${entry} points to a path that is not a page in Unreleased (${docs}/docs). Set "to" to an Unreleased page.`
      );
    }
  }

  for (const route of [...released].sort()) {
    if (unreleased.has(route) || pendingFrom.has(route)) {
      continue;
    }
    const configuredRedirect = configuredTo.get(route);
    if (configuredRedirect !== undefined) {
      if (!unreleased.has(toRoute(configuredRedirect))) {
        problems.push(
          `${configPath}: the redirect from ${route} points to ${configuredRedirect}, which is not a page in Unreleased. When Unreleased becomes the latest version, the redirect plugin fails the build. Point it to a page of both ${lastVersion} and Unreleased.`
        );
      }
      continue;
    }
    const candidates = findCandidates(route, unreleased);
    problems.push(
      `${docs}: the ${lastVersion} page ${route} has no page at the same path in Unreleased. When Unreleased becomes the latest version, this URL stops working. Add {"from": "${route}", "to": "<new path>"} to ${pendingPath}${candidates.length > 0 ? `, for example with "to" set to ${candidates.join(' or ')}` : ''}.`
    );
  }

  for (const redirect of configured) {
    const to = toRoute(redirect.to);
    if (isLatestVersionRoute(to, otherVersionPaths) && !released.has(to)) {
      problems.push(
        `${configPath}: the redirect from ${redirect.from} points to ${redirect.to}, which is not a page of ${lastVersion}. Point it to a ${lastVersion} page.`
      );
    }
  }

  return problems;
}

export function findPreviousVersionProblems({
  docs,
  previousVersion,
  lastVersion,
  previous,
  released,
  configured,
  otherVersionPaths,
}: {
  docs: string;
  previousVersion: string;
  lastVersion: string;
  previous: Set<string>;
  released: Set<string>;
  configured: Redirect[];
  otherVersionPaths: string[];
}) {
  const problems: string[] = [];
  const configPath = `${docs}/docusaurus.config.js`;
  const configuredTo = new Map(
    configured.map((redirect) => [normalizeRoute(redirect.from), redirect.to])
  );

  for (const route of [...previous].sort()) {
    if (released.has(route)) {
      continue;
    }
    const configuredRedirect = configuredTo.get(route);
    if (configuredRedirect === undefined) {
      const candidates = findCandidates(route, released);
      problems.push(
        `${docs}: the ${previousVersion} page ${route} has no page at the same path in ${lastVersion} and no redirect in ${configPath}. This URL stopped working when ${lastVersion} became the latest version. Add {from: '${route}', to: '<new path>'} to the redirects in ${configPath}${candidates.length > 0 ? `, for example with "to" set to ${candidates.join(' or ')}` : ''}. If you have just cut the docs version, move the entries of ${docs}/${PENDING_REDIRECTS} to the redirects in ${configPath}.`
      );
    } else if (
      !isLatestVersionRoute(toRoute(configuredRedirect), otherVersionPaths)
    ) {
      problems.push(
        `${configPath}: the redirect from ${route} points to ${configuredRedirect}, which is not a page of ${lastVersion}. Point it to a ${lastVersion} page.`
      );
    }
  }

  return problems;
}

export function listRoutes(
  files: Files,
  contentDir: string,
  sidebars: Sidebars
) {
  const docs = files
    .list(contentDir)
    .filter(isDocFile)
    .map((source) =>
      readDoc(source, readRequired(files, `${contentDir}/${source}`))
    )
    .filter((doc) => doc !== undefined);

  return new Set(
    [
      ...docs.map((doc) => doc.slug),
      ...listCategorySlugs(files, contentDir, sidebars, docs),
    ].map((slug) => normalizeRoute(`${ROUTE_BASE_PATH}${slug}`))
  );
}

export function evaluateSidebars(source: string): Sidebars {
  const module = { exports: {} as Sidebars };
  const require = () => {
    throw new Error('sidebars.js must not require other modules.');
  };
  new Function('module', 'exports', 'require', source)(
    module,
    module.exports,
    require
  );
  return module.exports;
}

export function findConfigRedirects(config: string): Redirect[] {
  const plugin = /['"]@docusaurus\/plugin-client-redirects['"]/.exec(config);
  if (!plugin) {
    return [];
  }
  const key = /\bredirects\s*:\s*/g;
  key.lastIndex = plugin.index;
  const match = key.exec(config);
  if (!match || config[match.index + match[0].length] !== '[') {
    throw new Error(
      'docusaurus.config.js must set redirects to an array literal in the options of @docusaurus/plugin-client-redirects.'
    );
  }
  const start = match.index + match[0].length;
  const literal = config.slice(start, findClosingBracket(config, start) + 1);
  const entries = new Function(`return ${literal};`)() as {
    from: string | string[];
    to: string;
  }[];
  return entries.flatMap(({ from, to }) =>
    (Array.isArray(from) ? from : [from]).map((path) => ({ from: path, to }))
  );
}

export function parsePendingRedirects(content: string, path: string) {
  const entries = JSON.parse(content) as unknown;
  const isRedirect = (entry: unknown): entry is Redirect =>
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as Redirect).from === 'string' &&
    typeof (entry as Redirect).to === 'string';
  if (!Array.isArray(entries) || !entries.every(isRedirect)) {
    throw new Error(
      `${path} must hold an array of {"from": "<path>", "to": "<path>"} objects.`
    );
  }
  return entries;
}

export function slugifyLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
    .replace(/ /g, '-');
}

function readRequired(files: Files, path: string) {
  const content = files.read(path);
  if (content === undefined) {
    throw new Error(`${path} does not exist.`);
  }
  return content;
}

function readVersionedSidebars(files: Files, path: string): Sidebars {
  const content = files.read(path);
  return content === undefined ? {} : (JSON.parse(content) as Sidebars);
}

function findCurrentVersionPath(config: string) {
  return (
    /\bcurrent:\s*\{[^}]*\bpath:\s*['"]([^'"]+)['"]/.exec(config)?.[1] ?? 'next'
  );
}

function toRoute(path: string) {
  return normalizeRoute(path.replace(/[?#].*$/, ''));
}

function normalizeRoute(route: string) {
  const collapsed = route.replace(/\/+/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/$/, '') : collapsed;
}

function findCandidates(route: string, unreleased: Set<string>) {
  const name = route.slice(route.lastIndexOf('/'));
  return [...unreleased].filter((candidate) => candidate.endsWith(name)).sort();
}

function isLatestVersionRoute(route: string, otherVersionPaths: string[]) {
  if (route !== ROUTE_BASE_PATH && !route.startsWith(`${ROUTE_BASE_PATH}/`)) {
    return false;
  }
  const firstSegment = route.slice(ROUTE_BASE_PATH.length + 1).split('/')[0];
  return !otherVersionPaths.includes(firstSegment);
}

function isDocFile(source: string) {
  return (
    /\.mdx?$/.test(source) &&
    source
      .split('/')
      .every(
        (segment) =>
          !segment.startsWith('_') &&
          !segment.startsWith('.') &&
          segment !== '__tests__'
      )
  );
}

function readDoc(source: string, content: string): Doc | undefined {
  const frontMatter = parseFrontMatter(content);
  if (frontMatter.draft === 'true') {
    return undefined;
  }
  const parseNumberPrefixes = frontMatter.parse_number_prefixes !== 'false';
  const strip = (name: string) =>
    parseNumberPrefixes ? stripNumberPrefix(name) : name;
  const sourceDirName = posix.dirname(source);
  const fileName = posix.parse(source).name;
  const baseId = frontMatter.id ?? strip(fileName);
  const dirSlug =
    sourceDirName === '.'
      ? '/'
      : `/${sourceDirName.split('/').map(strip).join('/')}/`;

  if (frontMatter.slug?.startsWith('/')) {
    return { source, slug: frontMatter.slug };
  }
  if (!frontMatter.slug && isCategoryIndex(fileName, sourceDirName)) {
    return { source, slug: dirSlug };
  }
  const slug = new URL(frontMatter.slug ?? baseId, `https://docs${dirSlug}`)
    .pathname;
  return { source, slug: decodeURI(slug) };
}

function listCategorySlugs(
  files: Files,
  contentDir: string,
  sidebars: Sidebars,
  docs: Doc[]
) {
  const slugs: string[] = [];
  const seenLabels = new Map<string, number>();

  const addLink = (link: unknown, label: string) => {
    const generatedIndex = link as { type?: string; slug?: string } | undefined;
    if (generatedIndex?.type !== 'generated-index') {
      return;
    }
    if (generatedIndex.slug) {
      slugs.push(generatedIndex.slug);
      return;
    }
    const original = slugifyLabel(label);
    let slug = original;
    while (seenLabels.has(slug)) {
      const count = (seenLabels.get(original) ?? 0) + 1;
      seenLabels.set(original, count);
      slug = `${original}-${count}`;
    }
    seenLabels.set(slug, 0);
    slugs.push(`/category/${slug}`);
  };

  const addAutogenerated = (dirName: string) => {
    const root = dirName === '.' ? '' : `${dirName.replace(/\/$/, '')}/`;
    const dirs = new Set<string>();
    for (const { source } of docs) {
      if (!source.startsWith(root)) {
        continue;
      }
      const segments = source.slice(root.length).split('/').slice(0, -1);
      segments.forEach((_, index) =>
        dirs.add(root + segments.slice(0, index + 1).join('/'))
      );
    }
    for (const dir of [...dirs].sort()) {
      const content = files.read(`${contentDir}/${dir}/_category_.json`);
      const metadata = content
        ? (JSON.parse(content) as { label?: string; link?: unknown })
        : {};
      addLink(
        metadata.link,
        metadata.label ?? stripNumberPrefix(posix.basename(dir))
      );
    }
  };

  const visit = (item: unknown): void => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (typeof item !== 'object' || item === null) {
      return;
    }
    const entry = item as {
      type?: string;
      label?: string;
      link?: unknown;
      items?: unknown;
      dirName?: string;
    };
    if (entry.type === 'category') {
      addLink(entry.link, entry.label ?? '');
      visit(entry.items);
    } else if (entry.type === 'autogenerated') {
      addAutogenerated(entry.dirName ?? '.');
    } else if (entry.type === undefined) {
      Object.values(entry).forEach(visit);
    }
  };

  Object.values(sidebars).forEach(visit);
  return slugs;
}

function findClosingBracket(text: string, start: number) {
  let depth = 0;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (char === "'" || char === '"' || char === '`') {
      index = skipString(text, index);
    } else if (text.startsWith('//', index)) {
      index = text.indexOf('\n', index);
    } else if (text.startsWith('/*', index)) {
      index = text.indexOf('*/', index) + 1;
    } else if (char === '[' || char === '{') {
      depth++;
    } else if (char === ']' || char === '}') {
      depth--;
      if (depth === 0) {
        return index;
      }
    }
  }
  throw new Error(
    'Found no end of the redirects list in docusaurus.config.js.'
  );
}

function parseFrontMatter(content: string): FrontMatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(content);
  const frontMatter: FrontMatter = {};
  for (const line of match?.[1].split(/\r?\n/) ?? []) {
    const field = /^(\w+):\s*(.*)$/.exec(line);
    if (field) {
      frontMatter[field[1]] = parseYamlScalar(field[2]);
    }
  }
  return frontMatter;
}

function stripNumberPrefix(name: string) {
  if (/^\d+[-_.]\d+/.test(name)) {
    return name;
  }
  return /^\d+\s*[-_.]+\s*([^-_.\s].*)$/.exec(name)?.[1] ?? name;
}

function isCategoryIndex(fileName: string, sourceDirName: string) {
  const lastDir = sourceDirName.split('/').at(-1)?.toLowerCase();
  return ['index', 'readme', lastDir].includes(fileName.toLowerCase());
}

function skipString(text: string, start: number) {
  const quote = text[start];
  for (let index = start + 1; index < text.length; index++) {
    if (text[index] === '\\') {
      index++;
    } else if (text[index] === quote) {
      return index;
    }
  }
  return text.length;
}

function parseYamlScalar(value: string) {
  const doubleQuoted = /^"((?:[^"\\]|\\.)*)"\s*(#.*)?$/.exec(value);
  if (doubleQuoted) {
    return decodeYamlEscapes(doubleQuoted[1]);
  }
  const singleQuoted = /^'((?:[^']|'')*)'\s*(#.*)?$/.exec(value);
  if (singleQuoted) {
    return singleQuoted[1].replace(/''/g, "'");
  }
  return value.replace(/\s+#.*$/, '').trim();
}

function decodeYamlEscapes(text: string) {
  return text.replace(
    /\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g,
    (escape: string, code: string) =>
      /^[xuU]/.test(code)
        ? String.fromCodePoint(parseInt(code.slice(1), 16))
        : (YAML_ESCAPES[code] ?? escape)
  );
}

if (import.meta.filename === process.argv[1]) {
  main();
}
