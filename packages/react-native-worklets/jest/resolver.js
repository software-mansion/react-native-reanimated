const path = require('path');

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const { defaultResolver } = options;
  if (
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    const workletOptions = { ...options };
    workletOptions.extensions = workletOptions.extensions?.filter(
      (ext) => !ext.includes('native')
    );
    options = workletOptions;
  }

  return defaultResolver(request, options);
};
