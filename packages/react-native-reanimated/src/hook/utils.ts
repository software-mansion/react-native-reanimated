'use strict';
import { useMemo, useRef } from 'react';

/**
 * Returns `true` on the render immediately following a fast refresh.
 *
 * Relies on `useMemo`'s cached value being reset when the component's hook
 * signature is refreshed while `useRef` is preserved - a mismatch between the
 * two proves the module was re-executed. Always `false` outside `__DEV__` since
 * fast refresh is a development-only mechanism.
 */
/* eslint-disable react-hooks/rules-of-hooks -- __DEV__ is build-constant */
export function useIsFastRefresh(): boolean {
  'use no memo';
  if (!__DEV__) {
    return false;
  }
  const signal = useMemo(() => ({}), []);
  const prev = useRef(signal);
  if (prev.current === signal) {
    return false;
  }
  prev.current = signal;
  return true;
}
/* eslint-enable react-hooks/rules-of-hooks */

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
    throw new Error(
      `[Reanimated] \`useAnimatedStyle\` has to return an object, found ${typeof styles} instead.`
    );
  } else if (Array.isArray(styles)) {
    throw new Error(
      '[Reanimated] `useAnimatedStyle` has to return an object and cannot return static styles combined with dynamic ones. Please do merging where a component receives props.'
    );
  }
}
