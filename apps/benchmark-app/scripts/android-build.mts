import path from 'node:path';

import type { VariantKey } from './config.mts';
import { applicationSuffix } from './variant-build.mts';
import type { PlatformBuild, VariantProject } from './variant-build.mts';

export const ARCHITECTURE = 'arm64-v8a';

const APK_PATH = 'android/app/build/outputs/apk/release/app-release.apk';
const GRADLE_TIMEOUT_MS = 90 * 60_000;

export function androidBuild(androidHome: string): PlatformBuild {
  return {
    platform: 'android',
    procedureFile: import.meta.filename,
    options: '',
    build: (project) => buildApk(project, androidHome),
  };
}

export function gradleArguments(key: VariantKey, profiling: boolean): string[] {
  return [
    'assembleRelease',
    `-PreactNativeArchitectures=${ARCHITECTURE}`,
    `-PbenchmarkApplicationIdSuffix=${applicationSuffix(key)}`,
    ...(profiling
      ? ['-PenableReanimatedProfiling=true', '-PenableWorkletsProfiling=true']
      : []),
  ];
}

async function buildApk(
  { directory, key, variant, run }: VariantProject,
  androidHome: string
): Promise<string> {
  await run({
    command: './gradlew',
    args: gradleArguments(key, variant.profiling),
    cwd: path.join(directory, 'android'),
    timeoutMs: GRADLE_TIMEOUT_MS,
    env: { ANDROID_HOME: androidHome },
  });
  return path.join(directory, APK_PATH);
}
