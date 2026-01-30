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
 * @param {import('@react-native/metro-config').MetroConfig} defaultConfig -
 *   Metro configuration https://reactnative.dev/docs/metro
 * @returns {{
 *   blockList: RegExp[];
 *   extraNodeModules: { [x: string]: string };
 * }}
 */
function getMonorepoMetroOptions(modulesToFilter, appDir, defaultConfig) {
  const blockList = getModuleBlocklist(modulesToFilter, defaultConfig);
  const extraNodeModules = getExtraNodeModules(modulesToFilter, appDir);

  return {
    blockList,
    extraNodeModules,
  };
}

/**
 * @param {string[]} moduleNames
 * @param {import('@react-native/metro-config').MetroConfig} defaultConfig -
 *   Metro configuration https://reactnative.dev/docs/metro
 * @returns {RegExp[]}
 */
function getModuleBlocklist(moduleNames, defaultConfig) {
  const blockList = moduleNames.reduce(
    (acc /** @type {RegExp[]} */, moduleName) => {
      blockedDirs.forEach((dir) => {
        acc.push(getBlockRegex(dir, moduleName));
      });
      return acc;
    },
    /** @type {RegExp[]} */ ([])
  );
  const mergedBlockList = [
    ...blockList.concat(defaultConfig?.resolver?.blockList ?? []),
  ];
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
