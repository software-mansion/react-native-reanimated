const path = require('path');

/**
 * @param {Object<string, string>} dependencies
 * @param {Set<string>} exclude
 */
function resolveDependencies(dependencies = {}, exclude) {
  return Object.fromEntries(
    Object.keys(dependencies)
      .filter((name) => !exclude.has(name))
      .map((name) => [
        name,
        { root: path.resolve(__dirname, `../../../node_modules/${name}`) },
      ])
  );
}

/**
 * This function will return the dependencies from the common-app package that
 * aren't listed in the current app's package.json
 *
 * @param {string} currentAppDir - The current app directory (e.g. __dirname)
 * @param {string[]} exclude - The dependencies to exclude from the common-app
 */
function getDependencies(currentAppDir = '.', exclude = []) {
  const commonAppDir = path.resolve(__dirname, '..');
  const commonAppPkg = require(path.resolve(commonAppDir, 'package.json'));

  const currentAppPkg = require(path.resolve(currentAppDir, 'package.json'));

  const excludedDependencies = new Set([
    ...Object.keys(currentAppPkg.devDependencies),
    ...Object.keys(currentAppPkg.dependencies),
    ...exclude,
  ]);

  return {
    // Get all common-app dependencies that aren't already in the current app
    ...resolveDependencies(commonAppPkg.devDependencies, excludedDependencies),
    ...resolveDependencies(commonAppPkg.dependencies, excludedDependencies),
  };
}

module.exports = {
  getDependencies,
};
