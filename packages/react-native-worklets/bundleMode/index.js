const path = require('path');

const workletsPackageParentDir = path.resolve(__dirname, '../..');
const reactNativeShimPath = path.join(__dirname, 'shims', 'reactNativeShim.js');
const turboModuleRegistryShimPath = path.join(
  __dirname,
  'shims',
  'turboModuleRegistryShim.js'
);
const turboModuleRegistryModuleName =
  'react-native/Libraries/TurboModule/TurboModuleRegistry';
const turboModuleRegistryFileSuffix = path.join(
  'react-native',
  'Libraries',
  'TurboModule',
  'TurboModuleRegistry.js'
);

function isResolvedTurboModuleRegistry(/** @type {any} */ result) {
  return (
    result?.type === 'sourceFile' &&
    typeof result.filePath === 'string' &&
    result.filePath.endsWith(turboModuleRegistryFileSuffix)
  );
}

const workletsPackageName = 'react-native-worklets';
const workletsDirPath = path.posix.join(workletsPackageName, '.worklets');
const workletsSrcEntryPath = path.posix.join(
  workletsPackageName,
  'src',
  'index.ts'
);
const workletsLibEntryPath = path.posix.join(
  workletsPackageName,
  'lib',
  'module',
  'index.js'
);

function bundleModeResolveRequest(
  /** @type {any} */ context,
  /** @type {string} */ moduleName,
  /** @type {any} */ platform,
  /** @type {any} */ userConfigResolveRequest
) {
  if (moduleName.startsWith(workletsDirPath)) {
    const fullModuleName = path.join(workletsPackageParentDir, moduleName);
    return { type: 'sourceFile', filePath: fullModuleName };
  }
  if (
    moduleName === 'react-native' &&
    context.originModulePath !== reactNativeShimPath
  ) {
    return { type: 'sourceFile', filePath: reactNativeShimPath };
  }
  if (
    moduleName === turboModuleRegistryModuleName &&
    context.originModulePath !== turboModuleRegistryShimPath
  ) {
    return { type: 'sourceFile', filePath: turboModuleRegistryShimPath };
  }
  const resolved = (userConfigResolveRequest || context.resolveRequest)(
    context,
    moduleName,
    platform
  );
  if (
    context.originModulePath !== turboModuleRegistryShimPath &&
    isResolvedTurboModuleRegistry(resolved)
  ) {
    return { type: 'sourceFile', filePath: turboModuleRegistryShimPath };
  }
  return resolved;
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
      if (
        moduleName === 'react-native' &&
        context.originModulePath !== reactNativeShimPath
      ) {
        return { type: 'sourceFile', filePath: reactNativeShimPath };
      }
      if (
        moduleName === turboModuleRegistryModuleName &&
        context.originModulePath !== turboModuleRegistryShimPath
      ) {
        return { type: 'sourceFile', filePath: turboModuleRegistryShimPath };
      }
      const resolved = context.resolveRequest(context, moduleName, platform);
      if (
        context.originModulePath !== turboModuleRegistryShimPath &&
        isResolvedTurboModuleRegistry(resolved)
      ) {
        return { type: 'sourceFile', filePath: turboModuleRegistryShimPath };
      }
      return resolved;
    },
  },
};

// eslint-disable-next-line jsdoc/require-param, jsdoc/require-returns
/** Use in Expo projects. */
function getBundleModeMetroConfig(/** @type {any} */ config) {
  config.serializer.createModuleIdFactory = bundleModeCreateModuleIdFactory;

  const currentResolveRequest = config?.resolver?.resolveRequest;
  config.resolver.resolveRequest = (
    /** @type {any} */ context,
    /** @type {string} */ moduleName,
    /** @type {any} */ platform
  ) =>
    bundleModeResolveRequest(
      context,
      moduleName,
      platform,
      currentResolveRequest
    );

  const currentGetTransformOptions = config?.transformer?.getTransformOptions;
  config.transformer.getTransformOptions = async (...args) => {
    const options = currentGetTransformOptions
      ? await currentGetTransformOptions(...args)
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
    if (moduleName.includes(workletsPackageName)) {
      if (
        moduleName.endsWith(workletsSrcEntryPath) ||
        moduleName.endsWith(workletsLibEntryPath)
      ) {
        const entryPointId = -2;
        idFileMap.set(moduleName, entryPointId);
        return entryPointId;
      } else if (moduleName.includes(workletsDirPath)) {
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
