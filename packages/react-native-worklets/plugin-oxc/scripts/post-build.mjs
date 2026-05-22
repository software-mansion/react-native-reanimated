#!/usr/bin/env node
import { copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const profile = process.argv[2] === 'release' ? 'release' : 'debug';

const platform = process.platform;
const arch = process.arch;

const map = {
  'darwin': { ext: 'dylib', prefix: 'lib' },
  'linux': { ext: 'so', prefix: 'lib' },
  'win32': { ext: 'dll', prefix: '' },
};

const { ext, prefix } = map[platform] || {};
if (!ext) {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

const src = join(root, 'target', profile, `${prefix}worklets_plugin_oxc.${ext}`);
const dest = join(root, `worklets-plugin-oxc.${platform}-${arch}.node`);

if (!existsSync(src)) {
  console.error(`Built artifact not found: ${src}`);
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`Copied ${src} → ${dest}`);
