#!/usr/bin/env node

// Packages the runtime-tests FabricExample.app into a zip for the CI artifact
// hand-off between a build job and a test job (see runtime-tests-ios-remote.yml).
//
// Build the app first:
//   node --experimental-strip-types scripts/runtime-tests-server.mts --build-only --configuration ReleaseRuntimeTests
// Then export it:
//   node --experimental-strip-types scripts/export-runtime-tests-app.mts --configuration ReleaseRuntimeTests --out dist/FabricExample.app.zip
//
// Only Release* configurations embed the three runtime-tests JS bundles and run
// without Metro; a Debug artifact is refused unless --allow-debug is passed,
// because it would silently depend on a Metro server wherever it is installed.

import { execFile } from 'node:child_process';
import type { ExecFileOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const LIBRARIES = ['reanimated', 'worklets', 'self-tests'];

const projectRoot = path.resolve(import.meta.dirname, '..');
const iosDir = path.join(projectRoot, 'ios');

const args: Record<string, string | true> = {};
const BOOLEAN_FLAGS = new Set(['print-path', 'allow-debug', 'help']);

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];

  if (!arg.startsWith('--')) {
    fail(`unexpected argument: ${arg} (see --help)`);
  }

  const name = arg.slice(2);

  if (BOOLEAN_FLAGS.has(name)) {
    args[name] = true;
  } else {
    const value = process.argv[++i];

    if (value == undefined || value.startsWith('--')) {
      fail(`missing value for --${name} (see --help)`);
    }

    args[name] = value;
  }
}

if (args.help) {
  console.log(`Usage: node --experimental-strip-types scripts/export-runtime-tests-app.mts [options]

Options:
  --configuration <cfg>  Build configuration to export (default: ReleaseRuntimeTests)
  --out <path>           Output zip path, relative to apps/fabric-example
                         (default: dist/FabricExample-<configuration>.app.zip)
  --print-path           Print the resolved .app path and exit without zipping
  --allow-debug          Permit exporting a Debug* configuration (needs Metro at runtime)
  --help                 Show this message`);
  process.exit(0);
}

const CONFIGURATION =
  typeof args.configuration === 'string'
    ? args.configuration
    : 'ReleaseRuntimeTests';
const OUT = path.resolve(
  projectRoot,
  typeof args.out === 'string'
    ? args.out
    : path.join('dist', `FabricExample-${CONFIGURATION}.app.zip`)
);

function fail(message: string): never {
  console.error(`[export-app] ${message}`);
  process.exit(1);
}

function run(
  command: string,
  argv: string[],
  options: ExecFileOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      argv,
      { maxBuffer: 64 * 1024 * 1024, ...options },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${command} failed: ${stderr || error.message}`));
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });
}

// Mirrors appPath() in runtime-tests-server.mts: the scheme is always
// DebugRuntimeTests; the configuration alone selects Debug/Release output.
async function resolveAppPath() {
  const { stdout } = await run(
    'xcodebuild',
    [
      '-workspace',
      'FabricExample.xcworkspace',
      '-scheme',
      'DebugRuntimeTests',
      '-configuration',
      CONFIGURATION,
      '-destination',
      'generic/platform=iOS Simulator',
      '-showBuildSettings',
      '-json',
    ],
    { cwd: iosDir }
  );

  const jsonStart = stdout.indexOf('[');

  if (jsonStart < 0) {
    fail(`xcodebuild -showBuildSettings returned no JSON payload`);
  }

  const entries: { buildSettings?: Record<string, string> }[] = JSON.parse(
    stdout.slice(jsonStart)
  );

  const entry =
    entries.find(
      (candidate) =>
        candidate.buildSettings?.WRAPPER_NAME === 'FabricExample.app'
    ) ?? entries[0];

  if (!entry?.buildSettings) {
    fail(`no build settings for configuration ${CONFIGURATION}`);
  }

  const { TARGET_BUILD_DIR, WRAPPER_NAME } = entry.buildSettings;

  return path.join(TARGET_BUILD_DIR, WRAPPER_NAME);
}

function assertExportable(app: string) {
  if (!fs.existsSync(app)) {
    fail(
      `no built app at ${app}\n` +
        `[export-app] build it first: node --experimental-strip-types scripts/runtime-tests-server.mts --build-only --configuration ${CONFIGURATION}`
    );
  }

  if (!/^Release/.test(CONFIGURATION)) {
    if (!args['allow-debug']) {
      fail(
        `${CONFIGURATION} apps load their JS from Metro and are not self-contained; ` +
          'export a Release* configuration, or pass --allow-debug if you know what you are doing'
      );
    }

    return;
  }

  // A Release* runtime-tests app must carry all three embedded bundles —
  // catch a mispackaged artifact here rather than as a connect-timeout in CI.
  const missing = LIBRARIES.map(
    (library) => `main.runtimeTests.${library}.jsbundle`
  ).filter((bundle) => !fs.existsSync(path.join(app, bundle)));

  if (missing.length > 0) {
    fail(
      `built app at ${app} is missing embedded bundles: ${missing.join(', ')}\n` +
        '[export-app] was it built with a *RuntimeTests configuration?'
    );
  }
}

async function main() {
  const app = await resolveAppPath();

  if (args['print-path']) {
    console.log(app);
    return;
  }

  assertExportable(app);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.rmSync(OUT, { force: true });

  // ditto preserves resource forks, symlinks, and permissions inside .app
  // bundles; --keepParent makes the zip unpack to <dir>/FabricExample.app.
  await run('ditto', ['-c', '-k', '--keepParent', app, OUT]);
  const sizeMb = (fs.statSync(OUT).size / (1024 * 1024)).toFixed(1);

  console.log(`[export-app] exported ${app}`);
  console.log(`[export-app] -> ${OUT} (${sizeMb} MB)`);
}

main().catch((error) => {
  fail(error.message);
});
