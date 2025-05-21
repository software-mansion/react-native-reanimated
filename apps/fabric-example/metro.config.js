const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const {
  getMetroAndroidAssetsResolutionFix,
  // @ts-ignore react-native-monorepo-tools doesn't have types.
} = require('react-native-monorepo-tools');
const androidAssetsResolutionFix = getMetroAndroidAssetsResolutionFix();
const path = require('path');

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
  serializer: {
    getModulesRunBeforeMainModule() {
      return [
        require.resolve('react-native-worklets/src/workletRuntimeEntry.ts'),
      ];
    },
    createModuleIdFactory() {
      let nextId = 0;
      const idFileMap = new Map();
      return (ppath) => {
        if (idFileMap.has(ppath)) {
          return idFileMap.get(ppath);
        }
        if (ppath.includes('react-native-worklets/__generatedWorklets/')) {
          const base = path.basename(ppath, '.js');
          const id = Number(base);
          idFileMap.set(ppath, id);
          return id;
        }
        idFileMap.set(ppath, nextId++);
        return idFileMap.get(ppath);
      };
    },
  },
  server: {
    enhanceMiddleware: (middleware) => {
      return androidAssetsResolutionFix.applyMiddleware(middleware);
    },
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config)
);
