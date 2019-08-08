/**
 * Mock implementation for test runners.
 *
 * Example:
 *
 * ```js
 * jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
 * ```
 */

const React = require('react');
const { View, Text, Image, ScrollView } = require('react-native');

const NOOP = () => undefined;

class Code extends React.Component {
  render() {
    return null;
  }
}

module.exports = {
  __esModule: true,

  default: {
    SpringUtils: {
      makeDefaultConfig: NOOP,
      makeConfigFromBouncinessAndSpeed: NOOP,
      makeConfigFromOrigamiTensionAndFriction: NOOP,
    },

    View,
    Text,
    Image,
    ScrollView,
    Code,

    Clock: NOOP,
    Node: NOOP,
    Value: NOOP,

    Extrapolate: {
      EXTEND: 'extend',
      CLAMP: 'clamp',
      IDENTITY: 'identity',
    },

    add: NOOP,
    sub: NOOP,
    multiply: NOOP,
    divide: NOOP,
    pow: NOOP,
    modulo: NOOP,
    sqrt: NOOP,
    log: NOOP,
    sin: NOOP,
    cos: NOOP,
    tan: NOOP,
    acos: NOOP,
    asin: NOOP,
    atan: NOOP,
    exp: NOOP,
    round: NOOP,
    floor: NOOP,
    ceil: NOOP,
    lessThan: NOOP,
    eq: NOOP,
    greaterThan: NOOP,
    lessOrEq: NOOP,
    greaterOrEq: NOOP,
    neq: NOOP,
    and: NOOP,
    or: NOOP,
    defined: NOOP,
    not: NOOP,
    set: NOOP,
    concat: NOOP,
    cond: NOOP,
    block: NOOP,
    call: NOOP,
    debug: NOOP,
    onChange: NOOP,
    startClock: NOOP,
    stopClock: NOOP,
    clockRunning: NOOP,
    event: NOOP,
    abs: NOOP,
    acc: NOOP,
    color: NOOP,
    diff: NOOP,
    diffClamp: NOOP,
    interpolate: NOOP,
    max: NOOP,
    min: NOOP,

    decay: NOOP,
    timing: NOOP,
    spring: NOOP,

    useCode: NOOP,
  },

  Easing: {
    linear: NOOP,
    ease: NOOP,
    quad: NOOP,
    cubic: NOOP,
    poly: () => NOOP,
    sin: NOOP,
    circle: NOOP,
    exp: NOOP,
    elastic: () => NOOP,
    back: () => NOOP,
    bounce: () => NOOP,
    bezier: () => NOOP,
    in: () => NOOP,
    out: () => NOOP,
    inOut: () => NOOP,
  },
};
