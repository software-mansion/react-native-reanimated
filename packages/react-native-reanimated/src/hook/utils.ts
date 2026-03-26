'use strict';
import { ReanimatedError } from '../common';

export function isAnimated(prop: unknown) {
  'worklet';
  if (Array.isArray(prop)) {
    return prop.some(isAnimated);
  } else if (typeof prop === 'object' && prop !== null) {
    if ((prop as Record<string, unknown>).onFrame !== undefined) {
      return true;
    } else {
      return Object.values(prop).some(isAnimated);
    }
  }
  return false;
}

// This function works because `Object.keys`
// return empty array of primitives and on arrays
// it returns array of its indices.
export function shallowEqual<
  T extends Record<string | number | symbol, unknown>,
>(a: T, b: T) {
  'worklet';
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (let i = 0; i < aKeys.length; i++) {
    if (a[aKeys[i]] !== b[aKeys[i]]) {
      return false;
    }
  }
  return true;
}

export function validateAnimatedStyles(styles: unknown[] | object) {
  'worklet';
  if (typeof styles !== 'object') {
    throw new ReanimatedError(
      `\`useAnimatedStyle\` has to return an object, found ${typeof styles} instead.`
    );
  } else if (Array.isArray(styles)) {
    throw new ReanimatedError(
      '`useAnimatedStyle` has to return an object and cannot return static styles combined with dynamic ones. Please do merging where a component receives props.'
    );
  }
}
