const path = require('path');

/**
 * @param {Object<string, string>} dependencies
 * @param {string[]} exclude
 */
function resolveDependencies(dependencies = {}, exclude = []) {
  return Object.fromEntries(
    Object.keys(dependencies)
      .filter((name) => !exclude.includes(name))
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
 */
function getDependencies(currentAppDir = '.') {
  const commonAppDir = path.resolve(__dirname, '..');
  const commonAppPkg = require(path.resolve(commonAppDir, 'package.json'));

  const currentAppPkg = require(path.resolve(currentAppDir, 'package.json'));
  const currentAppDeps = [
    ...Object.keys(currentAppPkg.devDependencies),
    ...Object.keys(currentAppPkg.dependencies),
  ];

  return {
    // Get all common-app dependencies that aren't already in the current app
    ...resolveDependencies(commonAppPkg.devDependencies, currentAppDeps),
    ...resolveDependencies(commonAppPkg.dependencies, currentAppDeps),
  };
}

module.exports = {
  getDependencies,
};
