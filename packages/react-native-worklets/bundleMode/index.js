const path = require('path');

const workletsPackageParentDir = path.resolve(__dirname, '../..');

const workletsDirPath = path.join('react-native-worklets', '.worklets');

function bundleModeResolveRequest(
  /** @type {any} */ context,
  /** @type {string} */ moduleName,
  /** @type {any} */ platform
) {
  if (moduleName.startsWith(workletsDirPath)) {
    const fullModuleName = path.join(workletsPackageParentDir, moduleName);
    return { type: 'sourceFile', filePath: fullModuleName };
  }
  return context.resolveRequest(context, moduleName, platform);
}

/** Use in React Native Community projects. */
const bundleModeMetroConfig = {
  serializer: {
    createModuleIdFactory: bundleModeCreateModuleIdFactory,
  },
  resolver: {
    resolveRequest: (
      /** @type {any} */ context,
      /** @type {string} */ moduleName,
      /** @type {any} */ platform
    ) => {
      if (moduleName.startsWith(workletsDirPath)) {
        const fullModuleName = path.join(workletsPackageParentDir, moduleName);
        return { type: 'sourceFile', filePath: fullModuleName };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

// eslint-disable-next-line jsdoc/require-param, jsdoc/require-returns
/** Use in Expo projects. */
function getBundleModeMetroConfig(/** @type {any} */ config) {
  config.serializer.createModuleIdFactory = bundleModeCreateModuleIdFactory;

  config.resolver.resolveRequest = bundleModeResolveRequest;

  const currentGetTransformOptions = config?.transformer?.getTransformOptions;
  config.transformer.getTransformOptions = async () => {
    const options = currentGetTransformOptions
      ? await currentGetTransformOptions()
      : {};
    return {
      ...options,
      transform: {
        ...options.transform,
        inlineRequires: true,
      },
    };
  };

  return config;
}

function bundleModeCreateModuleIdFactory() {
  let nextId = 0;
  const idFileMap = new Map();
  return (/** @type {string} */ moduleName) => {
    if (idFileMap.has(moduleName)) {
      return idFileMap.get(moduleName);
    }
    if (moduleName.includes('react-native-worklets/')) {
      if (
        moduleName.endsWith('react-native-worklets/src/index.ts') ||
        moduleName.endsWith('react-native-worklets/lib/module/index.js')
      ) {
        const entryPointId = -2;
        idFileMap.set(moduleName, entryPointId);
        return entryPointId;
      } else if (moduleName.includes('.worklets/')) {
        const base = path.basename(moduleName, '.js');
        const id = Number(base);
        idFileMap.set(moduleName, id);
        return id;
      }
    }
    idFileMap.set(moduleName, nextId++);
    return idFileMap.get(moduleName);
  };
}

module.exports = {
  getBundleModeMetroConfig,
  bundleModeMetroConfig,
};
