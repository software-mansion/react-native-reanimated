const path = require('path');

const monorepoRoot = path.resolve(__dirname, '..');
const commonAppPath = path.resolve(monorepoRoot, 'apps', 'common-app');
const reanimatedPath = path.resolve(
  monorepoRoot,
  'packages',
  'react-native-reanimated'
);
const workletsPath = path.resolve(
  monorepoRoot,
  'packages',
  'react-native-worklets'
);

/**
 * @param {string[]} moduleNames
 * @returns {RegExp[]}
 */
function getModuleBlocklist(moduleNames) {
  return moduleNames.reduce((acc /** @type {RegExp[]} */, moduleName) => {
    acc.push(getBlockRegex(monorepoRoot, moduleName));
    acc.push(getBlockRegex(commonAppPath, moduleName));
    acc.push(getBlockRegex(reanimatedPath, moduleName));
    acc.push(getBlockRegex(workletsPath, moduleName));
    return acc;
  }, /** @type {RegExp[]} */ ([]));
}

/**
 * @param {string} directoryName
 * @param {string} moduleName
 * @returns {RegExp}
 */
function getBlockRegex(directoryName, moduleName) {
  return new RegExp(
    `^${path.join(directoryName, 'node_modules', moduleName)}\\/.*$`
  );
}

module.exports = {
  getModuleBlocklist,
};
