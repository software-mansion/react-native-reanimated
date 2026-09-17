import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TARGETS } from './targets.mts';

interface LibraryNaming {
  ext: string;
  prefix: string;
}

const NAMING_BY_PLATFORM: Partial<Record<NodeJS.Platform, LibraryNaming>> = {
  darwin: { ext: 'dylib', prefix: 'lib' },
  linux: { ext: 'so', prefix: 'lib' },
  win32: { ext: 'dll', prefix: '' },
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const profile: string = process.argv[2] === 'release' ? 'release' : 'debug';

// Cross builds set CARGO_BUILD_TARGET, which also moves cargo's output to
// target/<triple>/<profile>.
const cargoTarget = process.env.CARGO_BUILD_TARGET;
const target = cargoTarget
  ? TARGETS[cargoTarget]
  : { platform: process.platform, arch: process.arch };
if (!target) {
  console.error(`Unsupported CARGO_BUILD_TARGET: ${cargoTarget}`);
  process.exit(1);
}

const { platform, arch } = target;

const naming = NAMING_BY_PLATFORM[platform];
if (!naming) {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

const src = join(
  root,
  'target',
  ...(cargoTarget ? [cargoTarget] : []),
  profile,
  `${naming.prefix}worklets_oxc_plugin.${naming.ext}`
);
const dest = join(root, `worklets-oxc-plugin.${platform}-${arch}.node`);

if (!existsSync(src)) {
  console.error(`Built artifact not found: ${src}`);
  process.exit(1);
}

copyFileSync(src, dest);

if (platform === 'darwin') {
  try {
    execFileSync('install_name_tool', [
      '-id',
      `@rpath/worklets-oxc-plugin.${platform}-${arch}.node`,
      dest,
    ]);
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    console.error(
      `Failed to rewrite the install_name of ${dest}. Loading it would make ` +
        `dyld also load ${src}, registering napi twice and crashing on import.\n` +
        `install_name_tool failed: ${cause}`
    );
    process.exit(1);
  }
}

console.log(`Copied ${src} → ${dest}`);
