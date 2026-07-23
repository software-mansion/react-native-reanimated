const workletsResolver = require('react-native-worklets/jest/resolver');

const WEB_ONLY_IN_JEST = new Set([
  'initializers',
  'mutables',
  'mappers',
  'ConfigHelper',
  'UpdateLayoutAnimations',
  'useAnimatedRef',
  'useAnimatedStyle',
  'JSPropsUpdater',
  'util',
]);

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const basename = request.split('/').pop();
  if (
    request.startsWith('.') &&
    WEB_ONLY_IN_JEST.has(basename) &&
    options.basedir.includes('react-native-reanimated')
  ) {
    return options.defaultResolver(request, {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes('native')),
    });
  }

  return workletsResolver(request, options);
};
