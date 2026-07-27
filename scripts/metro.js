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

const blockedDirs = [monorepoRoot, commonAppPath, reanimatedPath, workletsPath];

/**
 * @param {string[]} modulesToFilter - Module names to block from being resolved
 *   from unwanted locations.
 * @param {string} appDir - Absolute path to the app directory.
 * @param {RegExp | RegExp[] | undefined} existingBlockList - Existing Metro
 *   module block list.
 * @returns {{
 *   blockList: RegExp[];
 *   extraNodeModules: { [x: string]: string };
 * }}
 */
function getMonorepoMetroOptions(modulesToFilter, appDir, existingBlockList) {
  const blockList = getModuleBlocklist(modulesToFilter, existingBlockList);
  const extraNodeModules = getExtraNodeModules(modulesToFilter, appDir);

  return {
    blockList,
    extraNodeModules,
  };
}

/**
 * @param {string[]} moduleNames
 * @param {RegExp | RegExp[] | undefined} existingBlockList - Existing Metro
 *   module block list.
 * @returns {RegExp[]}
 */
function getModuleBlocklist(moduleNames, existingBlockList) {
  const blockList = moduleNames.reduce(
    (/** @type {RegExp[]} */ acc, /** @type {string} */ moduleName) => {
      blockedDirs.forEach((dir) => {
        acc.push(getBlockRegex(dir, moduleName));
      });
      return acc;
    },
    []
  );
  const mergedBlockList = [...blockList.concat(existingBlockList ?? [])];
  return mergedBlockList;
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

/**
 * @param {string[]} moduleNames
 * @param {string} appDir
 * @returns {{ [x: string]: string }}
 */
function getExtraNodeModules(moduleNames, appDir) {
  return moduleNames.reduce(
    (
      /** @type {{ [x: string]: string }} */ acc,
      /** @type {string} */ name
    ) => {
      acc[name] = path.join(appDir, 'node_modules', name);
      return acc;
    },
    /** @type {{ [key: string]: string }} */ ({})
  );
}

module.exports = {
  getMonorepoMetroOptions,
};
