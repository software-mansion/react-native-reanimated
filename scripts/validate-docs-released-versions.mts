import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

export const PACKAGES = [
  {
    name: 'react-native-reanimated',
    changelog: 'packages/react-native-reanimated/CHANGELOG.md',
    docs: 'docs/docs-reanimated',
    docsVersionPer: 'major',
  },
  {
    name: 'react-native-worklets',
    changelog: 'packages/react-native-worklets/CHANGELOG.md',
    docs: 'docs/docs-worklets',
    docsVersionPer: 'minor',
  },
] as const;

export type Package = (typeof PACKAGES)[number];
export type DocsVersionPer = Package['docsVersionPer'];
export type Version = { major: number; minor: number; patch: number };
export type Release = { version: Version; source: string };
export type LatestFromNpm = { version: string } | { error: string };

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const NPM_TIMEOUT_MS = 10_000;
const RELEASE_GUIDE = 'packages/react-native-reanimated/RELEASE.md';

async function main() {
  const { values } = parseArgs({
    options: {
      root: { type: 'string', default: REPOSITORY_ROOT },
      registry: { type: 'string', default: DEFAULT_REGISTRY },
      offline: { type: 'boolean', default: false },
    },
  });
  const root = values.root;
  const registry = values.registry;

  const { problems, messages } = await validate({
    readFile: (path) => readFileSync(join(root, path), 'utf8'),
    fetchLatest: values.offline
      ? async () => ({ error: 'the --offline flag is set' })
      : (name) => fetchLatestFromNpm(registry, name),
  });

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
      `Cut the docs version as described in ${RELEASE_GUIDE}.`,
    ].join('\n')
  );
  process.exitCode = 1;
}

export async function validate({
  readFile,
  fetchLatest,
}: {
  readFile: (path: string) => string;
  fetchLatest: (name: string) => Promise<LatestFromNpm>;
}) {
  const problems: string[] = [];
  const messages: string[] = [];

  for (const pkg of PACKAGES) {
    const candidates: Release[] = [];

    const changelogVersion = latestChangelogVersion(readFile(pkg.changelog));
    if (changelogVersion) {
      candidates.push({ version: changelogVersion, source: pkg.changelog });
    }

    const npm = await fetchLatest(pkg.name);
    if ('error' in npm) {
      messages.push(
        `${pkg.name}: skipped the npm \`latest\` dist-tag, because ${npm.error}. Using ${pkg.changelog} only.`
      );
    } else {
      const npmVersion = parseStableVersion(npm.version);
      if (npmVersion) {
        candidates.push({ version: npmVersion, source: 'npm `latest`' });
      }
    }

    const release = latestRelease(candidates);
    if (!release) {
      messages.push(
        `${pkg.name}: found no released version, nothing to check.`
      );
      continue;
    }

    const docsVersions = JSON.parse(
      readFile(`${pkg.docs}/versions.json`)
    ) as string[];
    const lastVersion =
      findLastVersion(readFile(`${pkg.docs}/docusaurus.config.js`)) ??
      docsVersions[0] ??
      'current';

    const packageProblems = findProblems({
      pkg,
      releases: candidates,
      docsVersions,
      lastVersion,
    });
    problems.push(...packageProblems);

    if (packageProblems.length === 0) {
      messages.push(
        `${pkg.name}: ${formatVersion(release.version)} (${release.source}) has the docs version ${lastVersion}, served as lastVersion.`
      );
    }
  }

  return { problems, messages };
}

export function latestChangelogVersion(changelog: string) {
  const versions = [...changelog.matchAll(/^## (\S+)/gm)]
    .map((match) => parseStableVersion(match[1]))
    .filter((version) => version !== undefined);
  return latestRelease(versions.map((version) => ({ version, source: '' })))
    ?.version;
}

export function parseStableVersion(text: string): Version | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (!match) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function latestRelease(releases: Release[]) {
  return releases.reduce<Release | undefined>(
    (latest, release) =>
      !latest || compareVersions(release.version, latest.version) > 0
        ? release
        : latest,
    undefined
  );
}

export function findLastVersion(config: string) {
  for (const line of config.split('\n')) {
    const code = line.trimStart();
    if (
      code.startsWith('//') ||
      code.startsWith('/*') ||
      code.startsWith('*')
    ) {
      continue;
    }
    const match = /\blastVersion:\s*['"]([^'"]+)['"]/.exec(code);
    if (match && !code.slice(0, match.index).includes('//')) {
      return match[1];
    }
  }
  return undefined;
}

export function findProblems({
  pkg,
  releases,
  docsVersions,
  lastVersion,
}: {
  pkg: Package;
  releases: Release[];
  docsVersions: string[];
  lastVersion: string;
}) {
  const covers = (label: string, version: Version) =>
    coversVersion(label, version, pkg.docsVersionPer);
  const describe = (release: Release) =>
    `${pkg.name} ${formatVersion(release.version)} (${release.source})`;

  const problems = releases
    .filter(
      (release) => !docsVersions.some((label) => covers(label, release.version))
    )
    .map(
      (release) =>
        `${describe(release)} is released, but ${pkg.docs}/versions.json has no docs version for it. Its docs are served only as Unreleased.`
    );
  if (problems.length > 0) {
    return problems;
  }

  const newest = latestRelease(releases);
  if (newest && !covers(lastVersion, newest.version)) {
    return [
      `${describe(newest)} is released, but lastVersion in ${pkg.docs}/docusaurus.config.js is ${lastVersion}, which does not cover it.`,
    ];
  }

  return [];
}

export function coversVersion(
  label: string,
  version: Version,
  docsVersionPer: DocsVersionPer
) {
  const major = /^(\d+)\.x$/.exec(label);
  if (major) {
    return docsVersionPer === 'major' && Number(major[1]) === version.major;
  }

  const minor = /^(\d+)\.(\d+)$/.exec(label);
  if (minor) {
    return (
      Number(minor[1]) === version.major && Number(minor[2]) === version.minor
    );
  }

  const range = /^(\d+)\.(\d+)-(\d+)\.(\d+)$/.exec(label);
  if (range) {
    const from = { major: Number(range[1]), minor: Number(range[2]), patch: 0 };
    const to = { major: Number(range[3]), minor: Number(range[4]), patch: 0 };
    const minorOnly = { ...version, patch: 0 };
    return (
      compareVersions(minorOnly, from) >= 0 &&
      compareVersions(minorOnly, to) <= 0
    );
  }

  return false;
}

export async function fetchLatestFromNpm(
  registry: string,
  name: string
): Promise<LatestFromNpm> {
  try {
    const response = await fetch(`${registry}/-/package/${name}/dist-tags`, {
      signal: AbortSignal.timeout(NPM_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { error: `the registry answered ${response.status}` };
    }
    const tags = (await response.json()) as { latest?: unknown };
    if (typeof tags.latest !== 'string') {
      return { error: 'the registry has no `latest` dist-tag' };
    }
    return { version: tags.latest };
  } catch (error) {
    return {
      error: `the registry is not reachable (${error instanceof Error ? error.message : String(error)})`,
    };
  }
}

function compareVersions(a: Version, b: Version) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

function formatVersion({ major, minor, patch }: Version) {
  return `${major}.${minor}.${patch}`;
}

if (import.meta.filename === process.argv[1]) {
  await main();
}
