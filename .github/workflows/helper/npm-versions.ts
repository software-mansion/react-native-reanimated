import { execFileSync } from 'node:child_process';

const NPM_VIEW_TIMEOUT_MS = 60_000;

const publishedVersionsCache = new Map<string, string[]>();

function npmView(spec: string, field: string): unknown {
  try {
    const rawOutput = execFileSync('npm', ['view', spec, field, '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: NPM_VIEW_TIMEOUT_MS,
    }).trim();

    return rawOutput ? JSON.parse(rawOutput) : null;
  } catch {
    return null;
  }
}

export function listPublishedVersions(pkgName: string): string[] {
  const cached = publishedVersionsCache.get(pkgName);
  if (cached) {
    return cached;
  }

  const parsed = npmView(pkgName, 'versions');
  const versions = Array.isArray(parsed) ? (parsed as string[]) : [];
  publishedVersionsCache.set(pkgName, versions);
  return versions;
}

export function toRange(version: string): string {
  return version.includes('x') ? version : `${version}.x`;
}

export function resolveNpmVersion(
  pkgName: string,
  versionRange: string
): string | null {
  const parsed = npmView(`${pkgName}@${versionRange}`, 'version');

  if (typeof parsed === 'string') {
    return parsed;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return null;
  }

  const matching = new Set(parsed as string[]);
  return (
    listPublishedVersions(pkgName).findLast((version) =>
      matching.has(version)
    ) ?? null
  );
}
