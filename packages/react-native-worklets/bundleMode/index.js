const path = require('path');

const prepareBundleModePolyfillPath = path.join(
  __dirname,
  'polyfills',
  'prepareBundleMode.js'
);

const workletsPackageName = 'react-native-worklets';
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

const bundleModeResolverConfig = {
  unstable_allowVirtualModules: true,
};

/** Use in React Native Community projects. */
const bundleModeMetroConfig = {
  serializer: {
    createModuleIdFactory: bundleModeCreateModuleIdFactory,
    polyfillModuleNames: [prepareBundleModePolyfillPath],
  },
  resolver: bundleModeResolverConfig,
};

// eslint-disable-next-line jsdoc/require-param, jsdoc/require-returns
/** Use in Expo projects. */
function getBundleModeMetroConfig(/** @type {any} */ config) {
  config.serializer.createModuleIdFactory = bundleModeCreateModuleIdFactory;
  config.serializer.polyfillModuleNames = [
    ...(config.serializer.polyfillModuleNames ?? []),
    prepareBundleModePolyfillPath,
  ];
  config.resolver = { ...config.resolver, ...bundleModeResolverConfig };

  return config;
}

function bundleModeCreateModuleIdFactory() {
  let nextId = 0;
  const idFileMap = new Map();
  return (/** @type {string} */ moduleNameRaw) => {
    const moduleName = moduleNameRaw.replace(/\\/g, '/');
    if (idFileMap.has(moduleName)) {
      return idFileMap.get(moduleName);
    }
    if (
      moduleName.includes(workletsPackageName) &&
      (moduleName.endsWith(workletsSrcEntryPath) ||
        moduleName.endsWith(workletsLibEntryPath))
    ) {
      const entryPointId = -2;
      idFileMap.set(moduleName, entryPointId);
      return entryPointId;
    }
    idFileMap.set(moduleName, nextId++);
    return idFileMap.get(moduleName);
  };
}

module.exports = {
  getBundleModeMetroConfig,
  bundleModeMetroConfig,
};
