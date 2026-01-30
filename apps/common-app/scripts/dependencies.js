/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

/**
 * @param {Object<string, string>} dependencies
 * @param {Set<string>} exclude
 * @param {string} appDir
 */
function resolveDependencies(dependencies = {}, exclude, appDir) {
  return Object.fromEntries(
    Object.keys(dependencies)
      .filter((name) => !exclude.has(name))
      .map((name) => [
        name,
        {
          root: getRootPath(name, appDir),
        },
      ])
  );
}

/**
 * @param {string} moduleName
 * @param {string} appDir
 */
function getRootPath(moduleName, appDir) {
  try {
    return path.dirname(
      require.resolve(`${moduleName}/package.json`, {
        paths: [appDir, __dirname],
      })
    );
  } catch {
    // If a package defines an `exports` field, `require.resolve` can fail.
    // Fortunately, none of the packages we care about cause this issue.
  }
}

/**
 * This function will return the dependencies from the common-app package that
 * aren't listed in the current app's package.json
 *
 * @param {string} appDir - The directory of the app that wants to obtain the
 *   dependencies. Used in resolution priority.
 * @param {string[]} [exclude=[]] - The dependencies to exclude from the
 *   common-app. Default is `[]`
 */
function getDependencies(appDir, exclude = []) {
  const commonAppDir = path.resolve(__dirname, '..');
  const commonAppPkg = require(path.resolve(commonAppDir, 'package.json'));

  const appPkg = require(path.resolve(appDir, 'package.json'));

  const excludedDependencies = new Set([
    ...Object.keys(appPkg.devDependencies),
    ...Object.keys(appPkg.dependencies),
    ...exclude,
  ]);

  return {
    // Get all common-app dependencies that aren't already in the current app
    ...resolveDependencies(
      commonAppPkg.devDependencies,
      excludedDependencies,
      appDir
    ),
    ...resolveDependencies(
      commonAppPkg.dependencies,
      excludedDependencies,
      appDir
    ),
  };
}

module.exports = {
  getDependencies,
};
