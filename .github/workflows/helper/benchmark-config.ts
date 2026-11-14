import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCENARIOS } from '../../../apps/benchmark-app/scripts/scenarios.mts';
import { resolveNpmVersion, toRange } from './npm-versions.ts';

interface Side {
  reanimated: string;
  worklets: string;
}

interface CompatibilityData {
  fabric: Record<string, { 'react-native-worklets'?: string[] }>;
}

const MAIN = 'main';
const ALL_SCENARIOS = 'all';
const REANIMATED_TARBALL = 'react-native-reanimated.tgz';
const WORKLETS_TARBALL = 'react-native-worklets.tgz';

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
  const tarballs = requiredEnv('TARBALLS_DIR');
  const config = {
    name: runName(),
    a: sideOf('A', tarballs),
    b: sideOf('B', tarballs),
    scenarios: scenariosOf(requiredEnv('SCENARIOS')),
  };
  fs.writeFileSync(
    requiredEnv('CONFIG_FILE'),
    `${JSON.stringify(config, null, 2)}\n`
  );
  console.log(JSON.stringify(config, null, 2));
}

function runName(): string {
  const label = (value: string) => value.replace(/[^A-Za-z0-9._-]/g, '-');
  return [
    requiredEnv('PLATFORM'),
    label(requiredEnv('A_REANIMATED')),
    'vs',
    label(requiredEnv('B_REANIMATED')),
  ].join('-');
}

function sideOf(side: 'A' | 'B', tarballs: string): Side {
  const reanimated = requiredEnv(`${side}_REANIMATED`);
  const worklets = process.env[`${side}_WORKLETS`] ?? '';
  if (reanimated === MAIN) {
    return {
      reanimated: path.join(tarballs, REANIMATED_TARBALL),
      worklets:
        worklets === '' || worklets === MAIN
          ? path.join(tarballs, WORKLETS_TARBALL)
          : worklets,
    };
  }
  return {
    reanimated,
    worklets:
      worklets === MAIN
        ? path.join(tarballs, WORKLETS_TARBALL)
        : worklets || compatibleWorklets(reanimated),
  };
}

function scenariosOf(value: string): string[] {
  if (value.trim() === ALL_SCENARIOS) {
    return [...SCENARIOS];
  }
  return value
    .split(',')
    .map((scenario) => scenario.trim())
    .filter(Boolean);
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
