import fs from 'node:fs';
import path from 'node:path';

import { applicationIdOf } from './application-id.mts';
import { addLibraries } from './build-copy.mts';
import {
  appBuildIdentity,
  collectBuildKeyInputs,
  listProjectFiles,
  variantBuildKey,
} from './build-key.mts';
import type { ToolIdentity } from './build-key.mts';
import type { StaticFlags, Variant, VariantKey } from './config.mts';
import { ToolError } from './errors.mts';
import type { PlatformName } from './platform.mts';
import type { Processes } from './processes.mts';

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
  lockfileSha256: string;
  appBuild: string;
}

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
  appBuild: string;
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
  procedureFiles: readonly string[];
  readToolIdentity: (request: BuildRequest) => Promise<ToolIdentity>;
  build: (project: VariantProject) => Promise<string>;
}

const BUILD_MARKER = 'benchmark-build.json';

const BUILD_LOG = 'benchmark-build.log';

export const BUILD_PROCEDURE_FILES = [
  import.meta.filename,
  path.join(import.meta.dirname, 'build-copy.mts'),
];

export async function buildVariant(
  request: BuildRequest,
  platformBuild: PlatformBuild
): Promise<BuiltVariant> {
  const { appDir, buildsDir, key, variant, log } = request;
  const files = listProjectFiles(appDir);
  const inputs = await collectBuildKeyInputs(request, platformBuild, files);
  const buildKey = variantBuildKey(inputs);
  const appBuild = appBuildIdentity(inputs);
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
  const libraries = await addLibraries(directory, variant, run);

  const artifact = await platformBuild.build({
    directory,
    key,
    variant,
    appBuild,
    run,
  });
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
    ...libraries,
    appBuild,
  };
  fs.writeFileSync(marker, `${JSON.stringify(built, null, 2)}\n`);
  return built;
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
