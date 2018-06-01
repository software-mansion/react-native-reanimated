import {
  cond,
  lessThan,
  multiply,
  sub,
  add,
  divide,
  greaterThan,
} from '../base';
import invariant from 'fbjs/lib/invariant';

function interpolateInternalSingle(value, inputRange, outputRange, offset) {
  const inS = inputRange[offset];
  const inE = inputRange[offset + 1];
  const outS = outputRange[offset];
  const outE = outputRange[offset + 1];
  const progress = divide(sub(value, inS), sub(inE, inS));
  return add(outS, multiply(progress, sub(outE, outS)));
}

function interpolateInternal(value, inputRange, outputRange, offset = 0) {
  if (inputRange.length - offset === 2) {
    return interpolateInternalSingle(value, inputRange, outputRange, offset);
  }
  return cond(
    lessThan(value, inputRange[offset + 1]),
    interpolateInternalSingle(value, inputRange, outputRange, offset),
    interpolateInternal(value, inputRange, outputRange, offset + 1)
  );
}

export const Extrapolate = {
  EXTEND: 'EXTEND',
  CLAMP: 'CLAMP',
  IDENTITY: 'IDENTITY',
};

function checkValidInputRange(arr) {
  // We can't validate animated nodes in JS.
  if (!arr.every(v => typeof v === 'number')) return;
  for (var i = 1; i < arr.length; ++i) {
    invariant(
      arr[i] >= arr[i - 1],
      'inputRange must be monotonically increasing ' + arr
    );
  }
}

function checkMinElements(name, arr) {
  invariant(arr.length >= 2, name + ' must have at least 2 elements');
}

function checkInfiniteRange(name, arr) {
  // We can't validate animated nodes in JS.
  if (!arr.every(v => typeof v === 'number')) return;
  invariant(
    arr.length !== 2 || arr[0] !== -Infinity || arr[1] !== Infinity,
    name + 'cannot be ]-infinity;+infinity[ ' + arr
  );
}

export default function interpolate(value, config) {
  const {
    inputRange,
    outputRange,
    extrapolate = Extrapolate.EXTEND,
    extrapolateLeft,
    extrapolateRight,
  } = config;
  checkMinElements('inputRange', inputRange);
  checkInfiniteRange('inputRange', inputRange);
  checkMinElements('outputRange', outputRange);
  checkInfiniteRange('outputRange', outputRange);
  checkValidInputRange(inputRange);
  invariant(
    inputRange.length === outputRange.length,
    'inputRange and outputRange must be the same length.'
  );

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
}
