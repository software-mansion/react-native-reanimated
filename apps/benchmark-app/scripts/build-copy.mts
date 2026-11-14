import fs from 'node:fs';
import path from 'node:path';

import type { PackageSource, StaticFlags, Variant } from './config.mts';
import { ToolError } from './errors.mts';
import type { LibraryState, ProjectCommand } from './variant-build.mts';

export interface AddedLibraries {
  installedVersions: LibraryState<string>;
  effectiveFlags: LibraryState<StaticFlags>;
}

const PACKAGE_NAMES: LibraryState<string> = {
  reanimated: 'react-native-reanimated',
  worklets: 'react-native-worklets',
};

const YARN_TIMEOUT_MS = 30 * 60_000;

export async function addLibraries(
  directory: string,
  variant: Variant,
  run: (command: ProjectCommand) => Promise<void>
): Promise<AddedLibraries> {
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
  writeStaticFlags(path.join(directory, 'package.json'), variant);
  return { installedVersions: installed.versions, effectiveFlags };
}

function packageSpec(name: string, source: PackageSource): string {
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

function mergeFlags(
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

function writeStaticFlags(packageJsonPath: string, variant: Variant) {
  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf8')
  ) as Record<string, unknown>;
  const flagsField = (flags: StaticFlags) =>
    Object.keys(flags).length > 0 ? { staticFeatureFlags: flags } : undefined;
  fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(
      {
        ...packageJson,
        reanimated: flagsField(variant.reanimatedFlags),
        worklets: flagsField(variant.workletsFlags),
      },
      null,
      2
    )}\n`
  );
}
