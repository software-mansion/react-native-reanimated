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
const { View, Text, Image, Animated } = require('react-native');

function NOOP() {}

class Code extends React.Component {
  render() {
    return null;
  }
}

const getValue = node => {
  if (typeof node === "number") {
    return node;
  }
  return node[" __value"];
};

class AnimatedValue {
  " __value": number;

  constructor(val: number) {
    this[" __value"] = val;
  }

  setValue(val: number) {
    this[" __value"] = val;
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
    ScrollView: Animated.ScrollView,
    Code,

    Clock: NOOP,
    Node: NOOP,
    Value: function() {
      return {
        setValue: NOOP,
      };
    },

    Extrapolate: {
      EXTEND: 'extend',
      CLAMP: 'clamp',
      IDENTITY: 'identity',
    },

    add: (a, b) => new AnimatedValue(getValue(a) + getValue(b)),
    sub: (a, b) => new AnimatedValue(getValue(a) - getValue(b)),
    multiply: (a, b) => new AnimatedValue(getValue(a) * getValue(b)),
    divide: (a, b) => new AnimatedValue(getValue(a) / getValue(b)),
    pow: (a, b) => new AnimatedValue(getValue(a) ** getValue(b)),
    modulo: (a, b) => new AnimatedValue(getValue(a) % getValue(b)),
    sqrt: a => new AnimatedValue(Math.sqrt(getValue(a))),
    log: a => new AnimatedValue(Math.log(getValue(a))),
    sin: a => new AnimatedValue(Math.sin(getValue(a))),
    cos: a => new AnimatedValue(Math.cos(getValue(a))),
    tan: a => new AnimatedValue(Math.tan(getValue(a))),
    acos: a => new AnimatedValue(Math.acos(getValue(a))),
    asin: a => new AnimatedValue(Math.asin(getValue(a))),
    atan: a => new AnimatedValue(Math.atan(getValue(a))),
    exp: a => new AnimatedValue(Math.exp(getValue(a))),
    round: a => new AnimatedValue(Math.round(getValue(a))),
    floor: a => new AnimatedValue(Math.floor(getValue(a))),
    ceil: a => new AnimatedValue(Math.ceil(getValue(a))),
    lessThan: (a, b) => new AnimatedValue(getValue(a) < getValue(b)),
    eq: (a, b) => new AnimatedValue(getValue(a) === getValue(b)),
    greaterThan: (a, b) => new AnimatedValue(getValue(a) > getValue(b)),
    lessOrEq: (a, b) => new AnimatedValue(getValue(a) <= getValue(b)),
    greaterOrEq: (a, b) => new AnimatedValue(getValue(a) >= getValue(b)),
    neq: (a, b) => new AnimatedValue(getValue(a) !== getValue(b)),
    and: (a, b) => new AnimatedValue(getValue(a) && getValue(b)),
    or: (a, b) => new AnimatedValue(getValue(a) || getValue(b)),
    defined: (a) => new AnimatedValue(getValue(a) !== null && getValue(a) !== undefined),
    not: (a) => new AnimatedValue(!getValue(a)),
    set: (a, b) => {
      a.setValue(getValue(b));
      return a;
    },
    concat: (a, b) => `${a}${b}`,
    cond: (a, b, c) => {
      if (getValue(a)) {
        return b;
      } else {
        return c; 
      }
    },
    block: (a) => a[a.length - 1],
    call: (a, b) => b(a),
    debug: NOOP,
    onChange: NOOP,
    startClock: NOOP,
    stopClock: NOOP,
    clockRunning: NOOP,
    event: NOOP,
    abs: (a) => Math.abs(getValue(a)),
    acc: NOOP,
    color: NOOP,
    diff: NOOP,
    diffClamp: NOOP,
    interpolate: NOOP,
    max: (a, b) => Math.max(getValue(a), getValue(b)),
    min: (a, b) => Math.min(getValue(a), getValue(b)),

    decay: NOOP,
    timing: NOOP,
    spring: NOOP,

    proc: cb => cb,

    useCode: NOOP,
    createAnimatedComponent: Component => Component,
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
