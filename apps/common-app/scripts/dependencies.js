/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

/**
 * @param {Object<string, string>} dependencies
 * @param {Set<string>} exclude
 */
function resolveDependencies(dependencies = {}, exclude, resolve) {
  return Object.fromEntries(
    Object.keys(dependencies)
      .filter((name) => !exclude.has(name))
      .map((name) => [
        name,
        {
          root: getRootPath(name, resolve),
        },
      ])
  );
}

/** @param {string} moduleName */
function getRootPath(moduleName, resolve) {
  let root;
  try {
    root = path.dirname(resolve(moduleName));
  } catch (e) {
    // console.log(e);
    // If a package defines an `exports` field, `require.resolve` can fail.
    // Fortunately, none of the packages we care about cause this issue.
  }
  if (!root) {
    try {
      root = path.dirname(require.resolve(`${moduleName}/package.json`));
    } catch (e) {
      // console.log(e);
      // Ignore
    }
  }
  return root;
}

/**
 * This function will return the dependencies from the common-app package that
 * aren't listed in the current app's package.json
 *
 * @param {string} currentAppDir - The current app directory (e.g. __dirname)
 * @param {string[]} exclude - The dependencies to exclude from the common-app
 */
function getDependencies(currentAppDir = '.', exclude = [], resolve) {
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
      resolve
    ),
    ...resolveDependencies(
      commonAppPkg.dependencies,
      excludedDependencies,
      resolve
    ),
  };
}

module.exports = {
  getDependencies,
};
