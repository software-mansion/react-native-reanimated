import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOW_MANY_MINORS = 3;
const OUTPUT_PATH = '/tmp/bundle-cost-matrix.json';

type CompatibilityDetails = {
  'react-native-worklets'?: string[];
};

type CompatibilityData = {
  fabric: Record<string, CompatibilityDetails>;
};

type MatrixEntry = {
  reanimatedRange: string;
  reanimatedVersion: string;
  workletsVersion: string;
};

type MatrixJob = MatrixEntry & { bundleMode: boolean };

const NPM_VIEW_TIMEOUT_MS = 60_000;

function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff) {
      return diff;
    }
  }
  return 0;
}

function resolveNpmVersion(
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
      return parsed.length > 0 ? parsed.sort(compareVersions).at(-1)! : null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function toRange(version: string): string {
  return version.includes('x') ? version : `${version}.x`;
}

/** Turns 4.6.x into [4, 6]. */
function parseSimpleRange(range: string): [number, number] | null {
  const match = /^(\d+)\.(\d+)\.x$/.exec(range.trim());
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2])];
}

function compareRangesDesc(a: string, b: string): number {
  const left = parseSimpleRange(a);
  const right = parseSimpleRange(b);
  if (!left || !right) {
    return 0;
  }
  return right[0] - left[0] || right[1] - left[1];
}

function highestMinor(versions: string[]): string | null {
  let best: string | null = null;
  let bestParts: [number, number] = [-1, -1];
  for (const version of versions) {
    const parts = parseSimpleRange(toRange(version));
    if (!parts) {
      continue;
    }
    if (
      parts[0] > bestParts[0] ||
      (parts[0] === bestParts[0] && parts[1] > bestParts[1])
    ) {
      best = version;
      bestParts = parts;
    }
  }
  return best;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.join(currentDir, '..', '..', '..', 'packages');

const compatibilityData = JSON.parse(
  fs.readFileSync(
    path.join(packagesDir, 'react-native-reanimated', 'compatibility.json'),
    'utf8'
  )
) as CompatibilityData;

const reanimatedRanges = Object.keys(compatibilityData.fabric)
  .filter((range) => parseSimpleRange(range) !== null)
  .sort(compareRangesDesc);

const matrix: MatrixEntry[] = [];

for (const reanimatedRange of reanimatedRanges) {
  if (matrix.length === HOW_MANY_MINORS) {
    break;
  }
  const details = compatibilityData.fabric[reanimatedRange];
  const workletsRanges = details['react-native-worklets'] ?? [];

  const workletsRange = highestMinor(workletsRanges);
  if (!workletsRange) {
    console.warn(`${reanimatedRange}: no compatible worklets range, skipping`);
    continue;
  }

  const reanimatedVersion = resolveNpmVersion(
    'react-native-reanimated',
    toRange(reanimatedRange)
  );
  if (!reanimatedVersion) {
    console.warn(`${reanimatedRange}: not published yet, skipping`);
    continue;
  }

  const workletsVersion = resolveNpmVersion(
    'react-native-worklets',
    toRange(workletsRange)
  );
  if (!workletsVersion) {
    console.warn(
      `${reanimatedRange}: worklets ${workletsRange} is not published yet, skipping`
    );
    continue;
  }

  matrix.push({
    reanimatedRange,
    reanimatedVersion,
    workletsVersion,
  });
}

if (matrix.length === 0) {
  throw new Error('resolved an empty bundle-cost matrix');
}

const jobs: MatrixJob[] = matrix.flatMap((entry) => [
  { ...entry, bundleMode: true },
  { ...entry, bundleMode: false },
]);

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(jobs));
console.log(JSON.stringify(jobs, null, 2));
