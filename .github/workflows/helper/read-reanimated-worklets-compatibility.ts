import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

    const parsed = JSON.parse(rawOutput);
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

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const compatibilityPath = path.join(
  currentDir,
  '..',
  '..',
  '..',
  'packages',
  'react-native-reanimated',
  'compatibility.json'
);

const workletsCompatibilityPath = path.join(
  currentDir,
  '..',
  '..',
  '..',
  'packages',
  'react-native-worklets',
  'compatibility.json'
);

const compatibilityData = JSON.parse(
  fs.readFileSync(compatibilityPath, 'utf8')
) as CompatibilityData;
const workletsCompatibilityData = JSON.parse(
  fs.readFileSync(workletsCompatibilityPath, 'utf8')
) as WorkletsCompatibilityData;

const fabricCompatibility = compatibilityData.fabric;
const matrixEntries: MatrixEntry[] = [];

for (const [reanimatedRange, details] of Object.entries(fabricCompatibility)) {
  if (reanimatedRange === 'nightly') {
    continue;
  }

  const workletsRanges = details['react-native-worklets'];
  const reactNativeVersions = details['react-native'] || [];

  if (!Array.isArray(workletsRanges) || workletsRanges.length === 0) {
    continue;
  }

  if (reactNativeVersions.length === 0) {
    continue;
  }

  const reanimatedNpmRange = toRange(reanimatedRange);
  const resolvedReanimatedVersion = resolveNpmVersion(
    'react-native-reanimated',
    reanimatedNpmRange
  );

  if (!resolvedReanimatedVersion) {
    continue;
  }

  for (const workletsRange of workletsRanges) {
    const workletsDetails = workletsCompatibilityData[workletsRange];
    const workletsReactNativeVersions = workletsDetails?.['react-native'] || [];

    if (workletsReactNativeVersions.length === 0) {
      continue;
    }

    const commonReactNativeVersions = reactNativeVersions.filter((version) =>
      workletsReactNativeVersions.includes(version)
    );

    if (commonReactNativeVersions.length === 0) {
      continue;
    }

    const workletsNpmRange = toRange(workletsRange);
    const resolvedWorkletsVersion = resolveNpmVersion(
      'react-native-worklets',
      workletsNpmRange
    );

    if (!resolvedWorkletsVersion) {
      continue;
    }

    for (const rnMinor of commonReactNativeVersions) {
      const reactNativeRange = toRange(rnMinor);
      const resolvedReactNativeVersion = resolveNpmVersion(
        'react-native',
        reactNativeRange
      );

      if (!resolvedReactNativeVersion) {
        continue;
      }

      matrixEntries.push({
        reactNativeVersion: resolvedReactNativeVersion,
        reanimatedVersion: resolvedReanimatedVersion,
        workletsVersion: resolvedWorkletsVersion,
      });
    }
  }
}

const uniqueEntries = new Map<string, MatrixEntry>();
for (const entry of matrixEntries) {
  const key = `${entry.reactNativeVersion}-${entry.reanimatedVersion}-${entry.workletsVersion}`;
  uniqueEntries.set(key, entry);
}

const matrix = Array.from(uniqueEntries.values());

fs.writeFileSync(
  '/tmp/reanimated-worklets-matrix.json',
  JSON.stringify(matrix)
);

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
  reactNativeVersion: string;
  reanimatedVersion: string;
  workletsVersion: string;
};
