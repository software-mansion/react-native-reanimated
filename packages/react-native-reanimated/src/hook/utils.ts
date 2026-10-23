'use strict';

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

const MAX_STYLE_VALUE_DEPTH = 4;

/**
 * Compares two style values. Arrays and plain objects (e.g. `transform`,
 * `shadowOffset` or `boxShadow`) are compared by their contents, because
 * updaters usually return new instances on every run even when nothing changed.
 * Values nested deeper than `MAX_STYLE_VALUE_DEPTH` are treated as different.
 */
export function isStyleValueEqual(a: unknown, b: unknown, depth = 0): boolean {
  'worklet';
  if (a === b) {
    return true;
  }
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null ||
    Array.isArray(a) !== Array.isArray(b) ||
    depth >= MAX_STYLE_VALUE_DEPTH
  ) {
    return false;
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  if (aKeys.length !== Object.keys(bRecord).length) {
    return false;
  }
  for (let i = 0; i < aKeys.length; i++) {
    const key = aKeys[i];
    if (
      !(key in bRecord) ||
      !isStyleValueEqual(aRecord[key], bRecord[key], depth + 1)
    ) {
      return false;
    }
  }
  return true;
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
