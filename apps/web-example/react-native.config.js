/**
 * This file is required to properly resolve native dependencies
 */
const path = require('path');

const commonAppDir = path.resolve(__dirname, '../common-app');
const commonAppPkg = require(path.resolve(commonAppDir, 'package.json'));

const dependencies = Object.fromEntries([
  // Include all common-app dependencies
  ...Object.keys(commonAppPkg.devDependencies || {}),
  ...Object.keys(commonAppPkg.dependencies || {})
].map(name => [name, {
  root: path.resolve(__dirname, `../../node_modules/${name}`)
}]));

module.exports = {
  dependencies,
  assets: ['./assets/fonts/'],
};
