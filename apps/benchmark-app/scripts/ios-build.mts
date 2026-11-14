import path from 'node:path';

import { applicationSuffix } from './application-id.mts';
import type { ToolIdentity } from './build-key.mts';
import type { VariantKey } from './config.mts';
import type { Processes } from './processes.mts';
import { BUILD_PROCEDURE_FILES } from './variant-build.mts';
import type {
  BuildRequest,
  PlatformBuild,
  VariantProject,
} from './variant-build.mts';

const APP_PATH =
  'ios/build/Build/Products/Release-iphoneos/ReanimatedBenchmark.app';

const BUNDLE_TIMEOUT_MS = 30 * 60_000;

const POD_TIMEOUT_MS = 60 * 60_000;

const XCODEBUILD_TIMEOUT_MS = 120 * 60_000;

const SIGN_TIMEOUT_MS = 15 * 60_000;

export const IOS_BUILD: PlatformBuild = {
  platform: 'ios',
  procedureFiles: [...BUILD_PROCEDURE_FILES, import.meta.filename],
  readToolIdentity: readIosToolIdentity,
  build: buildApp,
};

export async function signApp(
  processes: Processes,
  signCommand: string,
  app: string,
  ipa: string
) {
  await processes.run(signCommand, [app, ipa], {
    cwd: path.dirname(ipa),
    logFile: `${ipa}.sign.log`,
    timeoutMs: SIGN_TIMEOUT_MS,
  });
}

async function readIosToolIdentity({
  processes,
}: Pick<BuildRequest, 'processes'>): Promise<ToolIdentity> {
  const output = async (args: string[]) =>
    (await processes.run('xcrun', args)).stdout.trim().split('\n').join(', ');
  return {
    xcode: await output(['xcodebuild', '-version']),
    iphoneosSdk: await output(['--sdk', 'iphoneos', '--show-sdk-version']),
    iphoneosSdkBuild: await output([
      '--sdk',
      'iphoneos',
      '--show-sdk-build-version',
    ]),
  };
}

async function buildApp({
  directory,
  key,
  run,
}: VariantProject): Promise<string> {
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
  return path.join(directory, APP_PATH);
}

function xcodebuildArguments(key: VariantKey): string[] {
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
