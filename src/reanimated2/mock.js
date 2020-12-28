/* eslint-disable standard/no-callback-literal */
const { Easing } = require('./Easing');

const NOOP = () => {};

const ReanimatedV2 = {
  useSharedValue: (value) => ({ value }),
  useDerivedValue: (a) => ({ value: a() }),
  useAnimatedScrollHandler: () => NOOP,
  useAnimatedGestureHandler: () => NOOP,
  useAnimatedStyle: (style) => style,
  useAnimatedRef: () => ({ current: null }),
  useAnimatedReaction: NOOP,

  withTiming: (toValue, _, cb) => {
    cb && setTimeout(() => cb(true), 0);
    return toValue;
  },
  withSpring: (toValue, _, cb) => {
    cb && setTimeout(() => cb(true), 0);
    return toValue;
  },
  withDecay: (_, cb) => {
    cb && setTimeout(() => cb(true), 0);
    return 0;
  },
  cancelAnimation: NOOP,
  delay: (_, b) => b,
  sequence: () => 0,
  repeat: (a) => a,
  measure: () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pageX: 0,
    pageY: 0,
  }),
  Easing,
};

module.exports = {
  ...ReanimatedV2,
};
