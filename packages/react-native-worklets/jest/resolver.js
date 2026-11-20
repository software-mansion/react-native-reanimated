const path = require('path');

const {
  INLINE_MODULE_PREFIX,
  materializeInlineModule,
} = require('./inlineModuleResolver');

const WORKLETS_DIR = /[\\/]react-native-worklets[\\/](src|lib)[\\/]/;

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  if (request.startsWith(INLINE_MODULE_PREFIX)) {
    return materializeInlineModule(request, options);
  }

  const { defaultResolver } = options;
  if (
    WORKLETS_DIR.test(options.basedir + path.sep) ||
    request === 'react-native-worklets' ||
    request.startsWith('react-native-worklets/')
  ) {
    const workletOptions = { ...options };
    workletOptions.extensions = workletOptions.extensions?.filter(
      (ext) => !ext.includes('native')
    );
    options = workletOptions;
  }

  return defaultResolver(request, options);
};
