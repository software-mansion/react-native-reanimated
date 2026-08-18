import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TARGET = '(0, fs_1.writeFileSync)(dedicatedFilePath, transformedProg);';

const REPLACEMENT =
  '(0, fs_1.writeFileSync)(dedicatedFilePath, process.env.WORKLETS_WRITE_ORIGIN ' +
  '? `// __workletOrigin: ${state.file.opts.filename ?? "unknown"}\\n${transformedProg}` ' +
  ': transformedProg);';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(
  currentDir,
  '..',
  '..',
  '..',
  'apps',
  'fabric-example'
);

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve('react-native-worklets/package.json', {
  paths: [appDir],
});
const pluginPath = path.join(
  path.dirname(packageJsonPath),
  'plugin',
  'index.js'
);

const original = fs.readFileSync(pluginPath, 'utf8');

if (original.includes('__workletOrigin')) {
  console.log(`${pluginPath} already writes worklet origins`);
} else {
  const occurrences = original.split(TARGET).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `expected exactly one worklet file write in ${pluginPath}, found ${occurrences}; ` +
        'the bundle cost report would attribute extracted worklets to react-native-worklets'
    );
  }

  fs.writeFileSync(pluginPath, original.replace(TARGET, REPLACEMENT));
  console.log(`${pluginPath} now writes worklet origins`);
}
