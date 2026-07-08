const WEB_ONLY_IN_JEST = new Set([
  'initializers',
  'mutables',
  'mappers',
  'ConfigHelper',
  'UpdateLayoutAnimations',
]);

function shouldResolveToWeb(request, basedir) {
  if (
    basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    return true;
  }
  const basename = request.split('/').pop();
  return (
    request.startsWith('.') &&
    WEB_ONLY_IN_JEST.has(basename) &&
    basedir.includes('react-native-reanimated')
  );
}

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const { defaultResolver } = options;
  if (shouldResolveToWeb(request, options.basedir)) {
    return defaultResolver(request, {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes('native')),
    });
  }
  return defaultResolver(request, options);
};
