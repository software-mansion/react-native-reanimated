// Builds the release binary for every target in TARGETS from a macOS host.
// Linux links through zig (cargo-zigbuild), Windows through the downloaded
// MSVC SDK (cargo-xwin).

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Builder } from './targets.mts';
import { TARGETS } from './targets.mts';

// Oldest glibc the Linux binaries run on (Debian 10, Ubuntu 20.04, RHEL 8).
const GLIBC_VERSION = '2.28';

const INSTALL_HINTS: Record<Builder, string> = {
  cargo: 'Install Rust through rustup.',
  zigbuild: 'Run `brew install zig cargo-zigbuild`.',
  xwin: 'Run `cargo install --locked cargo-xwin`.',
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function run(command: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasCommand(command: string, args: string[]): boolean {
  return spawnSync(command, args, { stdio: 'ignore' }).status === 0;
}

if (process.platform !== 'darwin') {
  console.error('build:all cross-compiles from macOS only.');
  process.exit(1);
}

const missing = new Set<Builder>();
if (!hasCommand('rustup', ['--version'])) {
  missing.add('cargo');
}
if (
  !hasCommand('cargo', ['zigbuild', '--help']) ||
  !hasCommand('zig', ['version'])
) {
  missing.add('zigbuild');
}
if (!hasCommand('cargo', ['xwin', '--help'])) {
  missing.add('xwin');
}
if (missing.size > 0) {
  console.error('Missing cross-compilation tools:');
  for (const builder of missing) {
    console.error(`  ${INSTALL_HINTS[builder]}`);
  }
  process.exit(1);
}

const triples = Object.keys(TARGETS);
run('rustup', ['target', 'add', ...triples]);

for (const triple of triples) {
  console.log(`\nBuilding ${triple}`);
  switch (TARGETS[triple].builder) {
    case 'cargo':
      run('cargo', ['build', '--release', '--target', triple]);
      break;
    case 'zigbuild':
      run('cargo', [
        'zigbuild',
        '--release',
        '--target',
        `${triple}.${GLIBC_VERSION}`,
      ]);
      break;
    case 'xwin':
      run('cargo', ['xwin', 'build', '--release', '--target', triple]);
      break;
  }
  run(
    'node',
    ['--experimental-strip-types', 'scripts/post-build.mts', 'release'],
    {
      CARGO_BUILD_TARGET: triple,
    }
  );
}
