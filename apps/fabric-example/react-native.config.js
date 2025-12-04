/** This file is required to properly resolve native dependencies */
const { getDependencies } = require('../common-app/scripts/dependencies');

/**
 * @param {string} moduleName
 * @returns {string}
 */
function localResolve(moduleName) {
  return require.resolve(`${moduleName}/package.json`);
}

const dependencies = getDependencies(__dirname, [], localResolve);

module.exports = {
  dependencies,
  assets: ['./assets/fonts/'],
};
