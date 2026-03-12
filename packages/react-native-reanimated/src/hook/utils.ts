'use strict';
import { isWorkletFunction } from 'react-native-worklets';

import type { UnknownRecord } from '../common';
import { ReanimatedError } from '../common';

const objectIs: (a: unknown, b: unknown) => boolean =
  typeof Object.is === 'function'
    ? Object.is
    : (x, y) =>
        (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) ||
        (Number.isNaN(x as number) && Number.isNaN(y as number));

function areSingleValuesEqual(next: unknown, prev: unknown): boolean {
  if (objectIs(next, prev)) {
    return true;
  }

  if (
    !isWorkletFunction(next) ||
    !isWorkletFunction(prev) ||
    next.__workletHash !== prev.__workletHash
  ) {
    return false;
  }

  const nextClosure = next.__closure;
  const prevClosure = prev.__closure;

  const nextKeys = Object.keys(nextClosure);
  const prevKeys = Object.keys(prevClosure);

  return (
    prevKeys.length === nextKeys.length &&
    prevKeys.every(
      (key) =>
        key in nextClosure && objectIs(nextClosure[key], prevClosure[key])
    )
  );
}

export function areDependenciesEqual(
  nextDeps: Array<unknown> | undefined,
  prevDeps: Array<unknown> | undefined
) {
  if (!nextDeps || !prevDeps || nextDeps.length !== prevDeps.length) {
    return false;
  }

  for (let i = 0; i < prevDeps.length; ++i) {
    if (!areSingleValuesEqual(nextDeps[i], prevDeps[i])) {
      return false;
    }
  }

  return true;
}

export function areRecordValuesEqual(
  next: UnknownRecord | undefined,
  prev: UnknownRecord | undefined
) {
  if (!next || !prev) {
    return false;
  }

  const nextKeys = Object.keys(next);
  const prevKeys = Object.keys(prev);

  if (nextKeys.length !== prevKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (!areSingleValuesEqual(next[key], prev[key])) {
      return false;
    }
  }

  return true;
}

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
