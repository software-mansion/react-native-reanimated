const path = require('path');
const { setVersion } = require('../../../scripts/set-version');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const jsVersionPath = path.resolve(
  __dirname,
  '../src/platform-specific/jsVersion.ts'
);

setVersion(packageJsonPath, jsVersionPath);
