/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

/**
 * @param {Object<string, string>} dependencies
 * @param {Set<string>} exclude
 * @param {((moduleName: string) => string) | undefined} localResolve
 */
function resolveDependencies(dependencies = {}, exclude, localResolve) {
  return Object.fromEntries(
    Object.keys(dependencies)
      .filter((name) => !exclude.has(name))
      .map((name) => [
        name,
        {
          root: getRootPath(name, localResolve),
        },
      ])
  );
}

/**
 * @param {string} moduleName
 * @param {((moduleName: string) => string) | undefined} localResolve
 */
function getRootPath(moduleName, localResolve) {
  let root;
  if (localResolve) {
    try {
      root = path.dirname(localResolve(moduleName));
    } catch {
      // If a package defines an `exports` field, `require.resolve` can fail.
      // Fortunately, none of the packages we care about cause this issue.
    }
  }
  if (!root) {
    try {
      root = path.dirname(require.resolve(`${moduleName}/package.json`));
    } catch {
      // If a package defines an `exports` field, `require.resolve` can fail.
      // Fortunately, none of the packages we care about cause this issue.
    }
  }
  return root;
}

/**
 * This function will return the dependencies from the common-app package that
 * aren't listed in the current app's package.json
 *
 * @param {string} [currentAppDir='.'] - The current app directory (e.g.
 *   __dirname). Default is `'.'`
 * @param {string[]} [exclude=[]] - The dependencies to exclude from the
 *   common-app. Default is `[]`
 * @param {(moduleName: string) => string} [localResolve] - Function that
 *   resolves a module name to its path from the app directory. This way modules
 *   resolved from the concrete app are prioritized before those from
 *   common-app.
 */
function getDependencies(currentAppDir = '.', exclude = [], localResolve) {
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
    ...resolveDependencies(
      commonAppPkg.devDependencies,
      excludedDependencies,
      localResolve
    ),
    ...resolveDependencies(
      commonAppPkg.dependencies,
      excludedDependencies,
      localResolve
    ),
  };
}

module.exports = {
  getDependencies,
};
