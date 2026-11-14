import fs from 'node:fs';
import path from 'node:path';

import type { VariantKey } from './config.mts';
import type { Processes } from './tools.mts';
import { applicationSuffix } from './variant-build.mts';
import type {
  BuildRequest,
  PlatformBuild,
  ToolIdentity,
  VariantProject,
} from './variant-build.mts';

export const ARCHITECTURE = 'arm64-v8a';

const APK_PATH = 'android/app/build/outputs/apk/release/app-release.apk';
const GRADLE_TIMEOUT_MS = 90 * 60_000;
const MISSING = 'missing';

export function androidBuild(androidHome: string): PlatformBuild {
  return {
    platform: 'android',
    procedureFile: import.meta.filename,
    readToolIdentity: (request) =>
      readAndroidToolIdentity(request, androidHome),
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

export async function readAndroidToolIdentity(
  { appDir, processes }: Pick<BuildRequest, 'appDir' | 'processes'>,
  androidHome: string
): Promise<ToolIdentity> {
  const buildScript = fs.readFileSync(
    path.join(appDir, 'android', 'build.gradle'),
    'utf8'
  );
  const sdkPackage = (folder: string, versionName: string) => {
    const version = new RegExp(`\\b${versionName}\\s*=\\s*"([^"]+)"`).exec(
      buildScript
    )?.[1];
    return version === undefined
      ? MISSING
      : `${version} ${packageRevision(path.join(androidHome, folder, version))}`;
  };
  return {
    jdk: await readJdkVersion(processes),
    ndk: sdkPackage('ndk', 'ndkVersion'),
    buildTools: sdkPackage('build-tools', 'buildToolsVersion'),
  };
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

async function readJdkVersion(processes: Processes): Promise<string> {
  const java = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', 'java')
    : 'java';
  const { stdout, stderr } = await processes.run(java, ['-version']);
  return `${stderr || stdout}`.trim().split('\n').join(', ');
}

function packageRevision(folder: string): string {
  const properties = path.join(folder, 'source.properties');
  if (!fs.existsSync(properties)) {
    return MISSING;
  }
  return (
    /^Pkg\.Revision\s*=\s*(.+)$/m
      .exec(fs.readFileSync(properties, 'utf8'))?.[1]
      .trim() ?? MISSING
  );
}
