const path = require('path');
const fs = require('fs');
const { setVersion } = require('../../../scripts/set-version');
const { updatePeerDependency } = require('../../../scripts/version-utils');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const jsVersionPath = path.resolve(
  __dirname,
  '../src/platform-specific/jsVersion.ts'
);

setVersion(packageJsonPath, jsVersionPath);

const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
if (version.includes('nightly')) {
  updatePeerDependency(packageJsonPath, 'react-native-worklets', '*');
}
