const path = require('path');

const WORKLETS_PACKAGE_NAME = 'react-native-worklets';

function isInWorkletsPackage(dir) {
  return dir.split(path.sep).includes(WORKLETS_PACKAGE_NAME);
}

function requestsWorkletsPackage(request) {
  return (
    request === WORKLETS_PACKAGE_NAME ||
    request.startsWith(WORKLETS_PACKAGE_NAME + '/')
  );
}

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const { defaultResolver } = options;
  if (isInWorkletsPackage(options.basedir) || requestsWorkletsPackage(request)) {
    const workletOptions = { ...options };
    workletOptions.extensions = workletOptions.extensions?.filter(
      (ext) => !ext.includes('native')
    );
    options = workletOptions;
  }

  return defaultResolver(request, options);
};
