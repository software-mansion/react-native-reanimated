import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ciConfig } from '../../../apps/benchmark-app/scripts/ci-config.mts';
import { resolveNpmVersion, toRange } from './npm-versions.ts';

interface CompatibilityData {
  fabric: Record<string, { 'react-native-worklets'?: string[] }>;
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

main();

function main() {
  const config = ciConfig(
    {
      platform: requiredEnv('PLATFORM'),
      a: {
        reanimated: requiredEnv('A_REANIMATED'),
        worklets: process.env.A_WORKLETS ?? '',
      },
      b: {
        reanimated: requiredEnv('B_REANIMATED'),
        worklets: process.env.B_WORKLETS ?? '',
      },
      scenarios: requiredEnv('SCENARIOS'),
      sharedElementTransitions:
        requiredEnv('SHARED_ELEMENT_TRANSITIONS') === 'true',
      checkoutSha: requiredEnv('CHECKOUT_SHA'),
      tarballsDir: requiredEnv('TARBALLS_DIR'),
    },
    compatibleWorklets
  );
  fs.writeFileSync(
    requiredEnv('CONFIG_FILE'),
    `${JSON.stringify(config, null, 2)}\n`
  );
  console.log(JSON.stringify(config, null, 2));
}

function compatibleWorklets(reanimated: string): string {
  const [major, minor] = reanimated.split('.');
  const compatibility = JSON.parse(
    fs.readFileSync(compatibilityPath, 'utf8')
  ) as CompatibilityData;
  const ranges =
    compatibility.fabric[`${major}.${minor}.x`]?.['react-native-worklets'] ??
    [];
  const range = ranges.at(-1);
  const version =
    range === undefined
      ? null
      : resolveNpmVersion('react-native-worklets', toRange(range));
  if (version === null) {
    throw new Error(
      `No published react-native-worklets version fits react-native-reanimated ${reanimated} in compatibility.json`
    );
  }
  return version;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`The environment variable ${name} is not set`);
  }
  return value;
}
