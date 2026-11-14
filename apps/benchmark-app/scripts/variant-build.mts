import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type {
  PackageSource,
  StaticFlags,
  Variant,
  VariantKey,
} from './config.mts';
import { ToolError } from './errors.mts';
import type { PlatformName } from './platform.mts';
import type { Processes } from './tools.mts';

export interface LibraryState<T> {
  reanimated: T;
  worklets: T;
}

export interface BuiltVariant {
  variant: VariantKey;
  buildKey: string;
  directory: string;
  artifact: string;
  applicationId: string;
  installedVersions: LibraryState<string>;
  effectiveFlags: LibraryState<StaticFlags>;
}

export interface BuildKeyInputs {
  variant: Variant;
  platform: PlatformName;
  suffix: string;
  nodeVersion: string;
  toolIdentity: ToolIdentity;
  projectHash: string;
  tarballHashes: Partial<LibraryState<string>>;
  procedureHash: string;
}

export type ToolIdentity = Record<string, string>;

export interface BuildRequest {
  appDir: string;
  buildsDir: string;
  key: VariantKey;
  variant: Variant;
  processes: Processes;
  log: (message: string) => void;
}

export interface VariantProject {
  directory: string;
  key: VariantKey;
  variant: Variant;
  run: (command: ProjectCommand) => Promise<void>;
}

export interface ProjectCommand {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}

export interface PlatformBuild {
  platform: PlatformName;
  procedureFile: string;
  readToolIdentity: (request: BuildRequest) => Promise<ToolIdentity>;
  build: (project: VariantProject) => Promise<string>;
}

export const APPLICATION_ID = 'com.reanimatedbenchmark';
export const PACKAGE_NAMES: LibraryState<string> = {
  reanimated: 'react-native-reanimated',
  worklets: 'react-native-worklets',
};

const EXCLUDED_NAMES = new Set([
  'node_modules',
  'build',
  '.gradle',
  '.cxx',
  '.kotlin',
  '.yarn',
  'Pods',
  '.DS_Store',
]);
const EXCLUDED_PATHS = new Set(['scripts', 'vendor/bundle']);
const BUILD_MARKER = 'benchmark-build.json';
const BUILD_LOG = 'benchmark-build.log';
const YARN_TIMEOUT_MS = 30 * 60_000;

export async function buildVariant(
  request: BuildRequest,
  platformBuild: PlatformBuild
): Promise<BuiltVariant> {
  const { appDir, buildsDir, key, variant, log } = request;
  const files = listProjectFiles(appDir);
  const buildKey = variantBuildKey(
    await collectBuildKeyInputs(request, platformBuild, files)
  );
  const directory = path.join(buildsDir, buildKey);
  const marker = path.join(directory, BUILD_MARKER);
  if (fs.existsSync(marker)) {
    const built = JSON.parse(fs.readFileSync(marker, 'utf8')) as BuiltVariant;
    if (fs.existsSync(built.artifact)) {
      log(`variant ${key}: reuse build ${buildKey}`);
      return built;
    }
  }

  log(`variant ${key}: build ${buildKey} in ${directory}`);
  fs.rmSync(directory, { recursive: true, force: true });
  copyFiles(appDir, directory, files);
  const run = (command: ProjectCommand) =>
    runLogged(request, path.join(directory, BUILD_LOG), command);
  await run({
    command: 'yarn',
    args: [
      'add',
      packageSpec(PACKAGE_NAMES.reanimated, variant.reanimated),
      packageSpec(PACKAGE_NAMES.worklets, variant.worklets),
    ],
    cwd: directory,
    timeoutMs: YARN_TIMEOUT_MS,
  });

  const installed = readInstalledLibraries(directory);
  const effectiveFlags = {
    reanimated: mergeFlags(
      installed.defaultFlags.reanimated,
      variant.reanimatedFlags,
      PACKAGE_NAMES.reanimated
    ),
    worklets: mergeFlags(
      installed.defaultFlags.worklets,
      variant.workletsFlags,
      PACKAGE_NAMES.worklets
    ),
  };
  const packageJsonPath = path.join(directory, 'package.json');
  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf8')
  ) as Record<string, unknown>;
  fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(withStaticFlags(packageJson, variant), null, 2)}\n`
  );

  const artifact = await platformBuild.build({ directory, key, variant, run });
  if (!fs.existsSync(artifact)) {
    throw new ToolError(
      `The build of variant ${key} made no file at ${artifact}`
    );
  }
  const built: BuiltVariant = {
    variant: key,
    buildKey,
    directory,
    artifact,
    applicationId: applicationIdOf(key),
    installedVersions: installed.versions,
    effectiveFlags,
  };
  fs.writeFileSync(marker, `${JSON.stringify(built, null, 2)}\n`);
  return built;
}

export async function collectBuildKeyInputs(
  request: BuildRequest,
  platformBuild: PlatformBuild,
  files = listProjectFiles(request.appDir)
): Promise<BuildKeyInputs> {
  return {
    variant: request.variant,
    platform: platformBuild.platform,
    suffix: applicationSuffix(request.key),
    nodeVersion: process.version,
    toolIdentity: await platformBuild.readToolIdentity(request),
    projectHash: hashFiles(request.appDir, files),
    tarballHashes: hashTarballs(request.variant),
    procedureHash: hashBuildProcedure(platformBuild.procedureFile),
  };
}

export function listProjectFiles(appDir: string, relativeDir = ''): string[] {
  return fs
    .readdirSync(path.join(appDir, relativeDir), { withFileTypes: true })
    .map((entry) => ({
      entry,
      relativePath: relativeDir ? `${relativeDir}/${entry.name}` : entry.name,
    }))
    .filter(({ relativePath }) => isCopied(relativePath))
    .flatMap(({ entry, relativePath }) => {
      if (entry.isDirectory()) {
        return listProjectFiles(appDir, relativePath);
      }
      return entry.isFile() ? [relativePath] : [];
    })
    .sort();
}

export function isCopied(relativePath: string): boolean {
  const parts = relativePath.split('/');
  return (
    !parts.some((part) => EXCLUDED_NAMES.has(part)) &&
    !parts.some((_, i) => EXCLUDED_PATHS.has(parts.slice(0, i + 1).join('/')))
  );
}

export function variantBuildKey(inputs: BuildKeyInputs): string {
  const { variant } = inputs;
  const sorted = (values: Record<string, unknown>) =>
    Object.entries(values).sort(([left], [right]) => left.localeCompare(right));
  const description = JSON.stringify({
    reanimated: variant.reanimated,
    worklets: variant.worklets,
    tarballHashes: inputs.tarballHashes,
    reanimatedFlags: sorted(variant.reanimatedFlags),
    workletsFlags: sorted(variant.workletsFlags),
    bundleMode: variant.bundleMode,
    profiling: variant.profiling,
    platform: inputs.platform,
    suffix: inputs.suffix,
    nodeVersion: inputs.nodeVersion,
    toolIdentity: sorted(inputs.toolIdentity),
    projectHash: inputs.projectHash,
    procedureHash: inputs.procedureHash,
  });
  return crypto
    .createHash('sha256')
    .update(description)
    .digest('hex')
    .slice(0, 16);
}

export function applicationSuffix(key: VariantKey): string {
  return `.${key}`;
}

function hashFiles(root: string, files: string[]): string {
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash
      .update(file)
      .update('\0')
      .update(fs.readFileSync(path.join(root, file)))
      .update('\0');
  }
  return hash.digest('hex');
}

function hashTarballs(variant: Variant): Partial<LibraryState<string>> {
  const hashOf = (source: PackageSource) =>
    source.kind === 'tarball'
      ? crypto
          .createHash('sha256')
          .update(fs.readFileSync(source.path))
          .digest('hex')
      : undefined;
  return {
    reanimated: hashOf(variant.reanimated),
    worklets: hashOf(variant.worklets),
  };
}

function hashBuildProcedure(platformProcedureFile: string): string {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(import.meta.filename))
    .update(fs.readFileSync(platformProcedureFile))
    .digest('hex');
}

function copyFiles(from: string, to: string, files: string[]) {
  for (const file of files) {
    const target = path.join(to, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(from, file), target);
    fs.chmodSync(target, fs.statSync(path.join(from, file)).mode);
  }
}

async function runLogged(
  request: BuildRequest,
  logFile: string,
  { command, args, cwd, timeoutMs, env: commandEnv }: ProjectCommand
) {
  request.log(`  ${command} ${args.join(' ')}`);
  const env = {
    ...process.env,
    YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
    ...commandEnv,
  };
  await request.processes
    .run(command, args, { cwd, env, logFile, timeoutMs })
    .catch((error: Error) => {
      throw new ToolError(`${error.message}\nThe full log is in ${logFile}`);
    });
}

export function packageSpec(name: string, source: PackageSource): string {
  return source.kind === 'npm'
    ? `${name}@${source.version}`
    : `${name}@file:${source.path}`;
}

function readInstalledLibraries(directory: string) {
  const readJson = (...parts: string[]) =>
    JSON.parse(
      fs.readFileSync(path.join(directory, 'node_modules', ...parts), 'utf8')
    ) as Record<string, unknown>;
  const library = (name: string) => ({
    version: String(readJson(name, 'package.json').version),
    flags: readJson(
      name,
      'src',
      'featureFlags',
      'staticFlags.json'
    ) as StaticFlags,
  });
  const reanimated = library(PACKAGE_NAMES.reanimated);
  const worklets = library(PACKAGE_NAMES.worklets);
  return {
    versions: { reanimated: reanimated.version, worklets: worklets.version },
    defaultFlags: { reanimated: reanimated.flags, worklets: worklets.flags },
  };
}

export function mergeFlags(
  defaults: StaticFlags,
  overrides: StaticFlags,
  library: string
): StaticFlags {
  const unknown = Object.keys(overrides).filter((name) => !(name in defaults));
  if (unknown.length > 0) {
    throw new ToolError(
      `${library} has no static flag ${unknown.join(', ')} (known: ${Object.keys(defaults).join(', ')})`
    );
  }
  return { ...defaults, ...overrides };
}

export function withStaticFlags(
  packageJson: Record<string, unknown>,
  variant: Variant
): Record<string, unknown> {
  const flagsField = (flags: StaticFlags) =>
    Object.keys(flags).length > 0 ? { staticFeatureFlags: flags } : undefined;
  return {
    ...packageJson,
    reanimated: flagsField(variant.reanimatedFlags),
    worklets: flagsField(variant.workletsFlags),
  };
}

export function applicationIdOf(key: VariantKey): string {
  return `${APPLICATION_ID}${applicationSuffix(key)}`;
}
