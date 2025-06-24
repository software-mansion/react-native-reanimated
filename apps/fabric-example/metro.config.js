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

const workletsPackageParentDir = path.resolve(
  require.resolve('react-native-worklets/package.json'),
  '..',
  '..'
);

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
  //     return (/** @type {string} */ moduleName) => {
  //       if (idFileMap.has(moduleName)) {
  //         return idFileMap.get(moduleName);
  //       }
  //       if (moduleName.includes('react-native-worklets/__generatedWorklets/')) {
  //         const base = path.basename(moduleName, '.js');
  //         const id = Number(base);
  //         idFileMap.set(moduleName, id);
  //         return id;
  //       }
  //       idFileMap.set(moduleName, nextId++);
  //       return idFileMap.get(moduleName);
  //     };
  //   },
  // },
  // resolver: {
  //   resolveRequest: (context, moduleName, platform) => {
  //     if (moduleName.startsWith('react-native-worklets/__generatedWorklets/')) {
  //       const fullModuleName = path.join(workletsPackageParentDir, moduleName);
  //       console.log('moduleName', fullModuleName);
  //       return { type: 'sourceFile', filePath: fullModuleName };
  //     }
  //     console.log(`Resolving request: ${moduleName} for platform: ${platform}`);
  //     return context.resolveRequest(context, moduleName, platform);
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
