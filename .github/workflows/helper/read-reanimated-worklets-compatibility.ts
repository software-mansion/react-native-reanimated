import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveNpmVersion, toRange } from './npm-versions.ts';

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
const spmMatrixEntries: MatrixEntry[] = [];

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

for (const [reanimatedRange, details] of Object.entries(fabricCompatibility)) {
  if (reanimatedRange === 'nightly') {
    continue;
  }

  const spmReactNativeVersions = details['spm'] || [];
  const workletsRanges = details['react-native-worklets'];
  const reactNativeVersions = details['react-native'] || [];

  if (
    spmReactNativeVersions.length === 0 ||
    !Array.isArray(workletsRanges) ||
    workletsRanges.length === 0
  ) {
    continue;
  }

  const reanimatedNpmRange = toRange(reanimatedRange);
  const resolvedReanimatedVersion =
    resolveNpmVersion('react-native-reanimated', reanimatedNpmRange) ?? 'local';

  for (const workletsRange of workletsRanges) {
    const workletsDetails = workletsCompatibilityData[workletsRange];
    const workletsReactNativeVersions = workletsDetails?.['react-native'] || [];
    const workletsSpmReactNativeVersions = workletsDetails?.['spm'] || [];

    if (workletsReactNativeVersions.length === 0) {
      continue;
    }

    const workletsNpmRange = toRange(workletsRange);
    const resolvedWorkletsVersion =
      resolveNpmVersion('react-native-worklets', workletsNpmRange) ?? 'local';

    for (const rnMinor of spmReactNativeVersions) {
      if (
        !reactNativeVersions.includes(rnMinor) ||
        !workletsReactNativeVersions.includes(rnMinor) ||
        !workletsSpmReactNativeVersions.includes(rnMinor)
      ) {
        continue;
      }

      const reactNativeRange = toRange(rnMinor);
      const resolvedReactNativeVersion = resolveNpmVersion(
        'react-native',
        reactNativeRange
      );

      if (!resolvedReactNativeVersion) {
        continue;
      }

      spmMatrixEntries.push({
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

const uniqueSpmEntries = new Map<string, MatrixEntry>();
for (const entry of spmMatrixEntries) {
  const key = `${entry.reactNativeVersion}-${entry.reanimatedVersion}-${entry.workletsVersion}`;
  uniqueSpmEntries.set(key, entry);
}

const matrix = Array.from(uniqueEntries.values());
const spmMatrix = Array.from(uniqueSpmEntries.values());

fs.writeFileSync(
  '/tmp/reanimated-worklets-matrix.json',
  JSON.stringify(matrix)
);
fs.writeFileSync(
  '/tmp/reanimated-worklets-spm-matrix.json',
  JSON.stringify(spmMatrix)
);

type CompatibilityDetails = {
  'react-native'?: string[];
  'react-native-worklets'?: string[];
  spm?: string[];
};

type CompatibilityData = {
  fabric: Record<string, CompatibilityDetails>;
};

type WorkletsCompatibilityData = Record<
  string,
  { 'react-native'?: string[]; spm?: string[] } | undefined
>;

type MatrixEntry = {
  reactNativeVersion: string;
  reanimatedVersion: string;
  workletsVersion: string;
};
