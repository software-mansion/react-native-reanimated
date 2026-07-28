import { execSync } from 'node:child_process';

const NPM_VIEW_TIMEOUT_MS = 60_000;

export function toRange(version: string): string {
  return version.includes('x') ? version : `${version}.x`;
}

export function resolveNpmVersion(
  pkgName: string,
  versionRange: string
): string | null {
  const spec = `${pkgName}@${versionRange}`;
  try {
    const rawOutput = execSync(`npm view "${spec}" version --json`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: NPM_VIEW_TIMEOUT_MS,
    }).trim();

    if (!rawOutput) {
      return null;
    }

    const parsed = JSON.parse(rawOutput) as string | string[];
    if (Array.isArray(parsed)) {
      return parsed.at(-1) ?? null;
    }

    return parsed;
  } catch {
    return null;
  }
}
