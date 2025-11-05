const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

const workletsPackageParentDir = path.resolve(__dirname, '../..');

const defaults = getDefaultConfig(__dirname);

function getEntryPoints() {
  const entryPoints = [];
  try {
    entryPoints.push(
      require.resolve(
        'react-native-worklets/src/initializers/workletRuntimeEntry.native.ts'
      )
    );
  } catch {
    /* empty */
  }
  try {
    entryPoints.push(
      require.resolve(
        'react-native-worklets/lib/module/initializers/workletRuntimeEntry.native.js'
      )
    );
  } catch {
    /* empty */
  }
  return entryPoints;
}

module.exports = {
  bundleModeMetroConfig: {
    serializer: {
      getModulesRunBeforeMainModule(/** @type {string} dirname */ dirname) {
        return [
          ...getEntryPoints(),
          ...defaults.serializer.getModulesRunBeforeMainModule(dirname),
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
