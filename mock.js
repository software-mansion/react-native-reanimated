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
const { View, Text, Image, Animated, Platform } = require('react-native');

function NOOP() {}

function simulateCallbackFactory(...params) {
  return (callback) => {
    callback &&
      setTimeout(() => {
        callback(...params);
      }, 0);
  };
}

class Code extends React.Component {
  render() {
    return null;
  }
}

const getValue = node => {
  if (typeof node === "number") {
    return node;
  }
  return node && node[" __value"] || 0;
};

class AnimatedValue {
  constructor(val) {
    this[" __value"] = val;
  }

  setValue(val) {
    this[" __value"] = val;
  }

  interpolate() {
    return this;
  }
}

function createMockComponent(name) {
  return class extends React.Component {
    static displayName = name;

    render() {
      return this.props.children;
    }
  };
}

function createTransitioningComponent(Component) {
  return class extends React.Component {
    static displayName = `Transitioning.${Component.displayName || Component.name || 'Component'}`;

    setNativeProps() {}

    animateNextTransition() {}

    render() {
      return <Component {...this.props} />;
    }
  };
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
  Code,

  Clock: NOOP,
  Node: NOOP,
  Value: AnimatedValue,

  Extrapolate: {
    EXTEND: 'extend',
    CLAMP: 'clamp',
    IDENTITY: 'identity',
  },

  
  add: (...vals) =>
    new AnimatedValue(vals.map(v => getValue(v)).reduce((acc, v) => acc + v)),
  sub: (...vals) =>
    new AnimatedValue(vals.map(v => getValue(v)).reduce((acc, v) => acc - v)),
  divide: (...vals) =>
    new AnimatedValue(vals.map(v => getValue(v)).reduce((acc, v) => acc / v)),
  multiply: (...vals) =>
    new AnimatedValue(vals.map(v => getValue(v)).reduce((acc, v) => acc * v)),
  pow: (...vals) =>
    new AnimatedValue(vals.map(v => getValue(v)).reduce((acc, v) => acc ** v)),
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
  call: (a, b) => b(a.map(getValue)),
  debug: NOOP,
  onChange: NOOP,
  startClock: NOOP,
  stopClock: NOOP,
  clockRunning: NOOP,
  event: NOOP,
  abs: (a) => Math.abs(getValue(a)),
  acc: NOOP,
  color: (r, g, b, a = 1) => {
    const color = 16777216 * Math.round(getValue(a) * 255) + 65536 * getValue(r) + 256 * getValue(g) + getValue(b);
    if (Platform.OS === 'android') {
      // on Android color is represented as signed 32 bit int
      if (color < (1 << 31) >>> 0) {
        return new AnimatedValue(color);
      }
      return new AnimatedValue(color - 2 ** 32);
    }
    return new AnimatedValue(color);
  },
  diff: NOOP,
  diffClamp: NOOP,
  interpolate: NOOP,
  interpolateColors: NOOP,
  max: (a, b) => Math.max(getValue(a), getValue(b)),
  min: (a, b) => Math.min(getValue(a), getValue(b)),

  decay: () => ({
    start: simulateCallbackFactory({ finished: true }),
    stop: simulateCallbackFactory({ finished: true }),
  }),
  timing: () => ({
    start: simulateCallbackFactory({ finished: true }),
    stop: simulateCallbackFactory({ finished: true }),
  }),
  spring: () => ({
    start: simulateCallbackFactory({ finished: true }),
    stop: simulateCallbackFactory({ finished: true }),
  }),

  proc: cb => cb,

  useCode: NOOP,
  createAnimatedComponent: Component => Component,
}

module.exports = {
  __esModule: true,

  ...Reanimated,

  default: Reanimated,

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

  Transitioning: {
    View: createTransitioningComponent(View)
  },

  Transition: {
    Sequence: createMockComponent('Transition.Sequence'),
    Together: createMockComponent('Transition.Together'),
    In: createMockComponent('Transition.In'),
    Out: createMockComponent('Transition.Out'),
    Change: createMockComponent('Transition.Change')
  },

  createTransitioningComponent,
};
