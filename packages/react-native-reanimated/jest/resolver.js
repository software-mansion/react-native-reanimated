/**
 * Jest resolver that makes Reanimated testable: the listed modules only work
 * on top of a real native module, so under Jest their web variants are used
 * instead. It also enforces the web implementation of react-native-worklets
 * by chaining its resolver.
 *
 * Usage in a consumer project (jest.config.js):
 *
 *   resolver: 'react-native-reanimated/jest/resolver',
 *
 * If your project already uses a custom resolver, call this one from it and
 * forward the (request, options) arguments.
 */
const workletsResolver = require('react-native-worklets/jest/resolver');

const WEB_ONLY_IN_JEST = new Set([
  'initializers',
  'mutables',
  'mappers',
  'ConfigHelper',
  'UpdateLayoutAnimations',
  'useAnimatedRef',
  'useAnimatedStyle',
  'WorkletEventHandler',
  'JSPropsUpdater',
  'updateProps',
  'util',
  'css/component/AnimatedComponent',
]);

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const basename = request.split('/').pop();
  const isWebOnly = [...WEB_ONLY_IN_JEST].some((entry) =>
    entry.includes('/') ? request.endsWith(entry) : basename === entry
  );
  if (
    request.startsWith('.') &&
    isWebOnly &&
    options.basedir.includes('react-native-reanimated')
  ) {
    return options.defaultResolver(request, {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes('native')),
    });
  }

  return workletsResolver(request, options);
};
