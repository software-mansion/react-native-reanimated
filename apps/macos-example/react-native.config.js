/** This file is required to properly resolve native dependencies */
const { getDependencies } = require('../common-app/scripts/dependencies');

/**
 * @param {string} moduleName
 * @returns {string}
 */
function localResolve(moduleName) {
  return require.resolve(`${moduleName}/package.json`);
}

const dependencies = getDependencies(
  __dirname,
  [
    'react-native-nitro-modules', // Nitro Modules have trouble compiling on macOS.
    'react-native-mmkv',
  ],
  localResolve
);

module.exports = {
  dependencies,
  assets: ['./assets/fonts/'],
};
