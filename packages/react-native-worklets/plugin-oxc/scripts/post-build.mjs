#!/usr/bin/env node
import { copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const profile = process.argv[2] === 'release' ? 'release' : 'debug';

const platform = process.platform;
const arch = process.arch;

const map = {
  darwin: { ext: 'dylib', prefix: 'lib' },
  linux: { ext: 'so', prefix: 'lib' },
  win32: { ext: 'dll', prefix: '' },
};

const { ext, prefix } = map[platform] || {};
if (!ext) {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

const src = join(
  root,
  'target',
  profile,
  `${prefix}worklets_oxc_plugin.${ext}`
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
    console.error(
      `Failed to rewrite the install_name of ${dest}. Loading it would make ` +
        `dyld also load ${src}, registering napi twice and crashing on import.\n` +
        `install_name_tool failed: ${error && error.message}`
    );
    process.exit(1);
  }
}

console.log(`Copied ${src} → ${dest}`);
