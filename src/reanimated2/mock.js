const hooks = require('./Hooks');

/* eslint-disable standard/no-callback-literal */
const NOOP = () => {};
const ID = (t) => t;

const ReanimatedV2 = {
  useSharedValue: hooks.useSharedValue,
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
  Easing: {
    linear: ID,
    ease: ID,
    quad: ID,
    cubic: ID,
    poly: ID,
    sin: ID,
    circle: ID,
    exp: ID,
    elastic: ID,
    back: ID,
    bounce: ID,
    bezier: ID,
    in: ID,
    out: ID,
    inOut: ID,
  },
};

module.exports = {
  ...ReanimatedV2,
};
