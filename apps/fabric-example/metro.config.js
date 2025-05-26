const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const {
  getMetroAndroidAssetsResolutionFix,
  // @ts-ignore react-native-monorepo-tools doesn't have types.
} = require('react-native-monorepo-tools');
const path = require('path');

const androidAssetsResolutionFix = getMetroAndroidAssetsResolutionFix();
const root = path.resolve(__dirname, '../..');

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  transformer: {
    publicPath: androidAssetsResolutionFix.publicPath,
  },
  // Uncomment the following to enable experimental bundling.
  // --------------------------------------------------------
  // serializer: {
  //   getModulesRunBeforeMainModule() {
  //     return [
  //       require.resolve('react-native-worklets/src/workletRuntimeEntry.ts'),
  //     ];
  //   },
  //   createModuleIdFactory() {
  //     let nextId = 0;
  //     const idFileMap = new Map();
  //     return (modulePath) => {
  //       if (idFileMap.has(modulePath)) {
  //         return idFileMap.get(modulePath);
  //       }
  //       if (modulePath.includes('react-native-worklets/__generatedWorklets/')) {
  //         const base = path.basename(modulePath, '.js');
  //         const id = Number(base);
  //         idFileMap.set(modulePath, id);
  //         return id;
  //       }
  //       idFileMap.set(modulePath, nextId++);
  //       return idFileMap.get(modulePath);
  //     };
  //   },
  // },
  // --------------------------------------------------------
  server: {
    enhanceMiddleware: (middleware) => {
      return androidAssetsResolutionFix.applyMiddleware(middleware);
    },
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config)
);
