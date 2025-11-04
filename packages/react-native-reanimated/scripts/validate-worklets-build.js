'use strict';

// We don't use this script in runtime since `process` might not be available.

const path = require('path');
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = require(packageJsonPath);
const reanimatedVersion = packageJson.version;

const validateVersion = require('./validate-worklets-version');

const result = validateVersion(reanimatedVersion);
if (!result.ok) {
  // eslint-disable-next-line reanimated/use-logger
  console.error('[Reanimated] ' + result.message);
  process.exit(1);
}
