const path = require('path');

// Matches the package directory only, since pnpm also puts `react-native-worklets`
// in the store directory names of packages that peer-depend on it.
const WORKLETS_DIR = /[\\/]node_modules[\\/]react-native-worklets[\\/]/;

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
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
