import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TARGETS } from './targets.mts';

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

const triples = Object.keys(TARGETS).filter(
  (triple) => TARGETS[triple].platform === process.platform
);
if (triples.length === 0) {
  console.error(`No targets for ${process.platform}.`);
  process.exit(1);
}

run('rustup', ['target', 'add', ...triples]);

for (const triple of triples) {
  console.log(`\nBuilding ${triple}`);
  run('cargo', ['build', '--release', '--target', triple]);
  run(
    'node',
    ['--experimental-strip-types', 'scripts/post-build.mts', 'release'],
    {
      CARGO_BUILD_TARGET: triple,
    }
  );
}
