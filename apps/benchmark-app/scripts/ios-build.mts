import path from 'node:path';

import type { VariantKey } from './config.mts';
import { applicationSuffix } from './variant-build.mts';
import type { PlatformBuild, VariantProject } from './variant-build.mts';

const APP_PATH =
  'ios/build/Build/Products/Release-iphoneos/ReanimatedBenchmark.app';
const IPA_NAME = 'ReanimatedBenchmark.ipa';
const BUNDLE_TIMEOUT_MS = 30 * 60_000;
const POD_TIMEOUT_MS = 60 * 60_000;
const XCODEBUILD_TIMEOUT_MS = 120 * 60_000;
const SIGN_TIMEOUT_MS = 15 * 60_000;

export function iosBuild(signCommand: string): PlatformBuild {
  return {
    platform: 'ios',
    procedureFile: import.meta.filename,
    options: signCommand,
    build: (project) => buildIpa(project, signCommand),
  };
}

export function xcodebuildArguments(key: VariantKey): string[] {
  return [
    '-workspace',
    'ReanimatedBenchmark.xcworkspace',
    '-scheme',
    'ReanimatedBenchmark',
    '-configuration',
    'Release',
    '-sdk',
    'iphoneos',
    '-destination',
    'generic/platform=iOS',
    '-derivedDataPath',
    'build',
    `BENCHMARK_BUNDLE_IDENTIFIER_SUFFIX=${applicationSuffix(key)}`,
    'CODE_SIGNING_ALLOWED=NO',
    'build',
  ];
}

export function signArguments(
  signCommand: string,
  app: string,
  ipa: string
): string[] {
  return ['-c', `${signCommand} "$1" "$2"`, 'sign', app, ipa];
}

async function buildIpa(
  { directory, key, run }: VariantProject,
  signCommand: string
): Promise<string> {
  const iosDirectory = path.join(directory, 'ios');
  await run({
    command: 'bundle',
    args: ['install'],
    cwd: directory,
    timeoutMs: BUNDLE_TIMEOUT_MS,
  });
  await run({
    command: 'bundle',
    args: ['exec', 'pod', 'install'],
    cwd: iosDirectory,
    timeoutMs: POD_TIMEOUT_MS,
  });
  await run({
    command: 'xcodebuild',
    args: xcodebuildArguments(key),
    cwd: iosDirectory,
    timeoutMs: XCODEBUILD_TIMEOUT_MS,
  });
  const ipa = path.join(directory, IPA_NAME);
  await run({
    command: '/bin/sh',
    args: signArguments(signCommand, path.join(directory, APP_PATH), ipa),
    cwd: directory,
    timeoutMs: SIGN_TIMEOUT_MS,
  });
  return ipa;
}
