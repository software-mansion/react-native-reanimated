import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOW_MANY_MINORS = 3;
const OUTPUT_PATH = '/tmp/bundle-cost-matrix.json';

type CompatibilityDetails = {
  'react-native'?: string[];
  'react-native-worklets'?: string[];
};

type CompatibilityData = {
  fabric: Record<string, CompatibilityDetails>;
};

type WorkletsCompatibilityData = Record<
  string,
  { 'react-native'?: string[] } | undefined
>;

type MatrixEntry = {
  reanimatedRange: string;
  reanimatedVersion: string;
  workletsVersion: string;
  reactNativeVersion: string;
};

type MatrixJob = MatrixEntry & { bundleMode: boolean };

function resolveNpmVersion(
  pkgName: string,
  versionRange: string
): string | null {
  const spec = `${pkgName}@${versionRange}`;
  try {
    const rawOutput = execSync(`npm view "${spec}" version --json`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

    if (!rawOutput) {
      return null;
    }

    const parsed = JSON.parse(rawOutput) as string | string[];
    if (Array.isArray(parsed)) {
      return parsed[parsed.length - 1];
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

const workletsCompatibilityData = JSON.parse(
  fs.readFileSync(
    path.join(packagesDir, 'react-native-worklets', 'compatibility.json'),
    'utf8'
  )
) as WorkletsCompatibilityData;

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
  const reanimatedReactNative = details['react-native'] ?? [];

  const workletsRange = highestMinor(workletsRanges);
  if (!workletsRange) {
    console.warn(`${reanimatedRange}: no compatible worklets range, skipping`);
    continue;
  }

  const workletsReactNative =
    workletsCompatibilityData[workletsRange]?.['react-native'] ?? [];
  const commonReactNative = reanimatedReactNative.filter((version) =>
    workletsReactNative.includes(version)
  );
  const reactNativeMinor = highestMinor(commonReactNative);
  if (!reactNativeMinor) {
    console.warn(
      `${reanimatedRange}: no React Native version supported by both it and ` +
        `worklets ${workletsRange}, skipping`
    );
    continue;
  }

  const reanimatedVersion = resolveNpmVersion(
    'react-native-reanimated',
    toRange(reanimatedRange)
  );
  const workletsVersion = resolveNpmVersion(
    'react-native-worklets',
    toRange(workletsRange)
  );
  const reactNativeVersion = resolveNpmVersion(
    'react-native',
    toRange(reactNativeMinor)
  );

  if (!reanimatedVersion || !workletsVersion || !reactNativeVersion) {
    console.warn(
      `${reanimatedRange}: could not resolve published versions ` +
        `(reanimated=${reanimatedVersion}, worklets=${workletsVersion}, ` +
        `react-native=${reactNativeVersion}), skipping`
    );
    continue;
  }

  matrix.push({
    reanimatedRange,
    reanimatedVersion,
    workletsVersion,
    reactNativeVersion,
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
