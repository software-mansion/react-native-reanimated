import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveNpmVersion, toRange } from './npm-versions.ts';

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

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.join(currentDir, '..', '..', '..', 'packages');

const compatibilityData = JSON.parse(
  fs.readFileSync(
    path.join(packagesDir, 'react-native-reanimated', 'compatibility.json'),
    'utf8'
  )
) as CompatibilityData;

const reanimatedRanges = Object.keys(compatibilityData.fabric).filter(
  (range) => range !== 'nightly'
);

const matrix: MatrixEntry[] = [];

for (const reanimatedRange of reanimatedRanges) {
  if (matrix.length === HOW_MANY_MINORS) {
    break;
  }
  const details = compatibilityData.fabric[reanimatedRange];
  const workletsRanges = details['react-native-worklets'] ?? [];

  const workletsRange = workletsRanges.at(-1);
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
