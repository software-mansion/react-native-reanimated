import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULES = ['react-native-reanimated', 'react-native-worklets'];

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(
  currentDir,
  '..',
  '..',
  '..',
  'apps',
  'fabric-example',
  'metro.config.js'
);

const original = fs.readFileSync(configPath, 'utf8');
const replacement = MODULES.map((name) => `'${name}'`).join(', ');
const updated = original.replace(
  /getMonorepoMetroOptions\(\s*\[\s*\]/,
  `getMonorepoMetroOptions(\n  [${replacement}]`
);

if (updated === original) {
  throw new Error(
    `could not rewrite the getMonorepoMetroOptions call in ${configPath}; ` +
      'the nightly would have measured the monorepo packages instead of the ' +
      'installed releases'
  );
}

fs.writeFileSync(configPath, updated);
console.log(`metro.config.js now resolves [${replacement}] from the app`);
