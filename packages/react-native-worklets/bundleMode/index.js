const path = require('path');

const workletsPackageParentDir = path.resolve(__dirname, '../..');

module.exports = {
  bundleModeMetroConfig: {
    serializer: {
      getModulesRunBeforeMainModule() {
        return [
          require.resolve('react-native-worklets/src/workletRuntimeEntry.ts'),
          require.resolve(
            'react-native-worklets/lib/module/workletRuntimeEntry.js'
          ),
        ];
      },
      createModuleIdFactory() {
        let nextId = 0;
        const idFileMap = new Map();
        return (/** @type {string} */ moduleName) => {
          if (idFileMap.has(moduleName)) {
            return idFileMap.get(moduleName);
          }
          if (
            moduleName.includes('react-native-worklets/__generatedWorklets/')
          ) {
            const base = path.basename(moduleName, '.js');
            const id = Number(base);
            idFileMap.set(moduleName, id);
            return id;
          }
          idFileMap.set(moduleName, nextId++);
          return idFileMap.get(moduleName);
        };
      },
    },
    resolver: {
      resolveRequest: (
        /** @type {any} */ context,
        /** @type {string} */ moduleName,
        /** @type {any} */ platform
      ) => {
        if (
          moduleName.startsWith('react-native-worklets/__generatedWorklets/')
        ) {
          const fullModuleName = path.join(
            workletsPackageParentDir,
            moduleName
          );
          return { type: 'sourceFile', filePath: fullModuleName };
        }
        return context.resolveRequest(context, moduleName, platform);
      },
    },
  },
};
