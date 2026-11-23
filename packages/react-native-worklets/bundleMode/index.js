const fs = require('fs');
const path = require('path');

const workletsPackageParentDir = path.resolve(__dirname, '../..');
const prepareBundleModePolyfillPath = path.join(
  __dirname,
  'polyfills',
  'prepareBundleMode.js'
);

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
  return (userConfigResolveRequest || context.resolveRequest)(
    context,
    moduleName,
    platform
  );
}

const workletSourceMapCommentRegex = /^\/\/# workletSourceMap=(\S+)$/m;
const generatedWorkletsDir = path.resolve(__dirname, '..', '.worklets');

function bundleModeCustomizeFrame(/** @type {any} */ frame) {
  if (!frame.file) {
    return undefined;
  }
  const file = path.resolve(frame.file);
  if (path.dirname(file) !== generatedWorkletsDir || !file.endsWith('.js')) {
    return undefined;
  }
  try {
    const match = fs
      .readFileSync(file, 'utf8')
      .match(workletSourceMapCommentRegex);
    if (!match) {
      return undefined;
    }
    const map = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
    return map.sources?.[0] ? { file: map.sources[0] } : undefined;
  } catch {
    return undefined;
  }
}

/** Use in React Native Community projects. */
const bundleModeMetroConfig = {
  serializer: {
    createModuleIdFactory: bundleModeCreateModuleIdFactory,
    polyfillModuleNames: [prepareBundleModePolyfillPath],
  },
  symbolicator: {
    customizeFrame: bundleModeCustomizeFrame,
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
  config.serializer.polyfillModuleNames = [
    ...(config.serializer.polyfillModuleNames ?? []),
    prepareBundleModePolyfillPath,
  ];

  const currentCustomizeFrame = config.symbolicator?.customizeFrame;
  config.symbolicator = {
    ...config.symbolicator,
    customizeFrame: async (/** @type {any} */ frame) => ({
      ...(await currentCustomizeFrame?.(frame)),
      ...bundleModeCustomizeFrame(frame),
    }),
  };

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
