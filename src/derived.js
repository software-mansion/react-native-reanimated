import {
  cond,
  lessThan,
  multiply,
  block,
  defined,
  sub,
  set,
  add,
  divide,
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
  EXTEND: 'EXTEND',
  CLAMP: 'CLAMP',
  IDENTITY: 'IDENTITY',
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
