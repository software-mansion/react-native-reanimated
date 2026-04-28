/* eslint-disable */
// @ts-nocheck
const path = require('path');

let getDefaultConfig = () => ({});
try {
  getDefaultConfig = require('@react-native/metro-config').getDefaultConfig;
} catch {
  /* empty */
}

const workletsPackageParentDir = path.resolve(__dirname, '../..');

const defaults = getDefaultConfig(__dirname);

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
    getModulesRunBeforeMainModule(/** @type {string} dirname */ dirname) {
      return [
        ...getEntryPoints(),
        ...(defaults?.serializer?.getModulesRunBeforeMainModule?.(dirname) ||
          []),
      ];
    },
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

/** Use in Expo projects. */
function getBundleModeMetroConfig(config) {
  const currentGetModulesRunBeforeMainModule =
    config?.serializer?.getModulesRunBeforeMainModule;

  config.serializer.getModulesRunBeforeMainModule = (
    /** @type {string} dirname */ dirname
  ) => [
    ...getEntryPoints(),
    ...(currentGetModulesRunBeforeMainModule?.(dirname) || []),
  ];

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

function bundleModeCreateModuleIdFactory() {
  let nextId = 0;
  const idFileMap = new Map();
  return (/** @type {string} */ moduleName) => {
    if (idFileMap.has(moduleName)) {
      return idFileMap.get(moduleName);
    }
    if (moduleName.includes(workletsDirPath)) {
      const base = path.basename(moduleName, '.js');
      const id = Number(base);
      idFileMap.set(moduleName, id);
      return id;
    }
    idFileMap.set(moduleName, nextId++);
    return idFileMap.get(moduleName);
  };
}

module.exports = {
  getBundleModeMetroConfig,
  bundleModeMetroConfig,
};
