/**
 * Mock implementation for test runners.
 *
 * Example:
 *
 * ```js
 * jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
 * ```
 */

const { View, Text, Image, Animated, processColor } = require('react-native');
const ReanimatedV2 = require('./src/reanimated2/mock');

function NOOP() {
  // noop
}

const Reanimated = {
  SpringUtils: {
    makeDefaultConfig: NOOP,
    makeConfigFromBouncinessAndSpeed: NOOP,
    makeConfigFromOrigamiTensionAndFriction: NOOP,
  },

  View,
  Text,
  Image,
  ScrollView: Animated.ScrollView,
  FlatList: Animated.FlatList,

  Extrapolate: {
    EXTEND: 'extend',
    CLAMP: 'clamp',
    IDENTITY: 'identity',
  },

  processColor,

  interpolate: NOOP,
  interpolateColor: NOOP,
  clamp: NOOP,
  createAnimatedComponent: (Component) => Component,
  addWhitelistedUIProps: NOOP,
  addWhitelistedNativeProps: NOOP,
};

module.exports = {
  __esModule: true,

  ...Reanimated,
  ...ReanimatedV2,

  default: {
    ...Reanimated,
  },
};
