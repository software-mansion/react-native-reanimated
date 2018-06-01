import { Platform } from 'react-native';
import {
  cond,
  lessThan,
  greaterThan,
  multiply,
  block,
  defined,
  sub,
  set,
  add,
  divide,
  round,
} from './base';
import AnimatedValue from './core/AnimatedValue';
import { adapt } from './utils';

export const abs = function(a) {
  return cond(lessThan(a, 0), multiply(-1, a), a);
};

export const min = function(a, b) {
  a = adapt(a);
  b = adapt(b);
  return cond(lessThan(a, b), a, b);
};

export const max = function(a, b) {
  a = adapt(a);
  b = adapt(b);
  return cond(lessThan(a, b), b, a);
};

export const diff = function(v) {
  const stash = new AnimatedValue(0);
  const prev = new AnimatedValue();
  return block([
    set(stash, cond(defined(prev), sub(v, prev), 0)),
    set(prev, v),
    stash,
  ]);
};

export const color = function(r, g, b, a = 1) {
  if (a instanceof AnimatedValue) {
    a = round(multiply(a, 255));
  } else {
    a = Math.round(a * 255);
  }
  const color = add(
    multiply(a, 1 << 24),
    multiply(r, 1 << 16),
    multiply(g, 1 << 8),
    b
  );
  if (Platform.OS === 'android') {
    // on Android color is represented as signed 32 bit int
    return cond(
      lessThan(color, (1 << 31) >>> 0),
      color,
      sub(color, Math.pow(2, 32))
    );
  }
  return color;
};

export const acc = function(v) {
  const acc = new AnimatedValue(0);
  return set(acc, add(acc, v));
};

export const diffClamp = function(a, minVal, maxVal) {
  const value = new AnimatedValue();
  return set(
    value,
    min(max(add(cond(defined(value), value, a), diff(a)), minVal), maxVal)
  );
};

const interpolateInternalSingle = function(
  value,
  inputRange,
  outputRange,
  offset
) {
  const inS = inputRange[offset];
  const inE = inputRange[offset + 1];
  const outS = outputRange[offset];
  const outE = outputRange[offset + 1];
  const progress = divide(sub(value, inS), sub(inE, inS));
  return add(outS, multiply(progress, sub(outE, outS)));
};

const interpolateInternal = function(
  value,
  inputRange,
  outputRange,
  offset = 0
) {
  if (inputRange.length - offset === 2) {
    return interpolateInternalSingle(value, inputRange, outputRange, offset);
  }
  return cond(
    lessThan(value, inputRange[offset + 1]),
    interpolateInternalSingle(value, inputRange, outputRange, offset),
    interpolateInternal(value, inputRange, outputRange, offset + 1)
  );
};

export const Extrapolate = {
  EXTEND: 'extend',
  CLAMP: 'clamp',
  IDENTITY: 'identity',
};

export const interpolate = function(value, config) {
  const {
    inputRange,
    outputRange,
    extrapolate = Extrapolate.EXTEND,
    extrapolateLeft,
    extrapolateRight,
  } = config;
  const left = extrapolateLeft || extrapolate;
  const right = extrapolateRight || extrapolate;
  let output = interpolateInternal(value, inputRange, outputRange);

  if (left === Extrapolate.EXTEND) {
  } else if (left === Extrapolate.CLAMP) {
    output = cond(lessThan(value, inputRange[0]), outputRange[0], output);
  } else if (left === Extrapolate.IDENTITY) {
    output = cond(lessThan(value, inputRange[0]), value, output);
  }

  if (right === Extrapolate.EXTEND) {
  } else if (right === Extrapolate.CLAMP) {
    output = cond(
      greaterThan(value, inputRange[inputRange.length - 1]),
      outputRange[outputRange.length - 1],
      output
    );
  } else if (right === Extrapolate.IDENTITY) {
    output = cond(
      greaterThan(value, inputRange[inputRange.length - 1]),
      value,
      output
    );
  }

  return output;
};
