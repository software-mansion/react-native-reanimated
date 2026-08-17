import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  listPublishedVersions,
  resolveNpmVersion,
  toRange,
} from './npm-versions.ts';

const HOW_MANY_MINORS = 2;
const OUTPUT_PATH = '/tmp/bundle-cost-matrix.json';
const REANIMATED = 'react-native-reanimated';
const WORKLETS = 'react-native-worklets';
const MAIN = 'main';

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

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.join(currentDir, '..', '..', '..', 'packages');

const compatibilityData = JSON.parse(
  fs.readFileSync(
    path.join(packagesDir, REANIMATED, 'compatibility.json'),
    'utf8'
  )
) as CompatibilityData;

const knownRanges = new Set(
  Object.keys(compatibilityData.fabric).filter((range) => range !== 'nightly')
);

const reanimatedRanges: string[] = [];
for (const version of listPublishedVersions(REANIMATED).toReversed()) {
  if (version.includes('-')) {
    continue;
  }
  const range = toRange(version.split('.').slice(0, 2).join('.'));
  if (knownRanges.has(range) && !reanimatedRanges.includes(range)) {
    reanimatedRanges.push(range);
  }
}

const matrix: MatrixEntry[] = [];

for (const reanimatedRange of reanimatedRanges) {
  if (matrix.length === HOW_MANY_MINORS) {
    break;
  }
  const details = compatibilityData.fabric[reanimatedRange];
  const workletsRanges = details['react-native-worklets'] ?? [];

  if (workletsRanges.length === 0) {
    console.warn(`${reanimatedRange}: no compatible worklets range, skipping`);
    continue;
  }

  const reanimatedVersion = resolveNpmVersion(
    REANIMATED,
    toRange(reanimatedRange)
  );
  if (!reanimatedVersion) {
    console.warn(`${reanimatedRange}: not published yet, skipping`);
    continue;
  }

  const workletsVersion = resolveNpmVersion(
    WORKLETS,
    workletsRanges.map(toRange).join(' || ')
  );
  if (!workletsVersion) {
    console.warn(
      `${reanimatedRange}: worklets ${workletsRanges.join(', ')} are not published yet, skipping`
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

const mainEntry: MatrixEntry = {
  reanimatedRange: MAIN,
  reanimatedVersion: MAIN,
  workletsVersion: MAIN,
};

const jobs: MatrixJob[] = [mainEntry, ...matrix].flatMap((entry) => [
  { ...entry, bundleMode: true },
  { ...entry, bundleMode: false },
]);

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(jobs));
console.log(JSON.stringify(jobs, null, 2));
