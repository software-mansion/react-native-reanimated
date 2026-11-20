import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { applicationSuffix } from './application-id.mts';
import type { PackageSource, Variant } from './config.mts';
import type { PlatformName } from './platform.mts';
import type {
  BuildRequest,
  LibraryState,
  PlatformBuild,
} from './variant-build.mts';

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
    procedureHash: hashFileContents(platformBuild.procedureFiles),
  };
}

export function variantBuildKey(inputs: BuildKeyInputs): string {
  const { variant } = inputs;
  return hashOf({
    reanimated: variant.reanimated,
    worklets: variant.worklets,
    tarballHashes: inputs.tarballHashes,
    reanimatedFlags: sortedEntries(variant.reanimatedFlags),
    workletsFlags: sortedEntries(variant.workletsFlags),
    bundleMode: variant.bundleMode,
    profiling: variant.profiling,
    platform: inputs.platform,
    suffix: inputs.suffix,
    nodeVersion: inputs.nodeVersion,
    toolIdentity: sortedEntries(inputs.toolIdentity),
    projectHash: inputs.projectHash,
    procedureHash: inputs.procedureHash,
  }).slice(0, 16);
}

export function appBuildIdentity(inputs: BuildKeyInputs): string {
  return hashOf({
    platform: inputs.platform,
    nodeVersion: inputs.nodeVersion,
    toolIdentity: sortedEntries(inputs.toolIdentity),
    projectHash: inputs.projectHash,
    procedureHash: inputs.procedureHash,
  });
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

function hashFileContents(files: readonly string[]): string {
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex');
}

function isCopied(relativePath: string): boolean {
  const parts = relativePath.split('/');
  return (
    !parts.some((part) => EXCLUDED_NAMES.has(part)) &&
    !parts.some((_, i) => EXCLUDED_PATHS.has(parts.slice(0, i + 1).join('/')))
  );
}

function hashOf(description: object): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(description))
    .digest('hex');
}

function sortedEntries(values: Record<string, unknown>) {
  return Object.entries(values).sort(([left], [right]) =>
    left.localeCompare(right)
  );
}
