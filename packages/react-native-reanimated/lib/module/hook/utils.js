'use strict';

import { ReanimatedError } from "../errors.js";
// Builds one big hash from multiple worklets' hashes.
export function buildWorkletsHash(worklets) {
  // For arrays `Object.values` returns the array itself.
  return Object.values(worklets).reduce((acc, worklet) => acc + worklet.__workletHash.toString(), '');
}

// Builds dependencies array for useEvent handlers.
export function buildDependencies(dependencies, handlers) {
  const handlersList = Object.values(handlers).filter(handler => handler !== undefined);
  if (!dependencies) {
    dependencies = handlersList.map(handler => {
      return {
        workletHash: handler.__workletHash,
        closure: handler.__closure
      };
    });
  } else {
    dependencies.push(buildWorkletsHash(handlersList));
  }
  return dependencies;
}

// This is supposed to work as useEffect comparison.
export function areDependenciesEqual(nextDependencies, prevDependencies) {
  function is(x, y) {
    return x === y && (x !== 0 || 1 / x === 1 / y) || Number.isNaN(x) && Number.isNaN(y);
  }
  const objectIs = typeof Object.is === 'function' ? Object.is : is;
  function areHookInputsEqual(nextDeps, prevDeps) {
    if (!nextDeps || !prevDeps || prevDeps.length !== nextDeps.length) {
      return false;
    }
    for (let i = 0; i < prevDeps.length; ++i) {
      if (!objectIs(nextDeps[i], prevDeps[i])) {
        return false;
      }
    }
    return true;
  }
  return areHookInputsEqual(nextDependencies, prevDependencies);
}
export function isAnimated(prop) {
  'worklet';

  if (Array.isArray(prop)) {
    return prop.some(isAnimated);
  } else if (typeof prop === 'object' && prop !== null) {
    if (prop.onFrame !== undefined) {
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
export function shallowEqual(a, b) {
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
export function validateAnimatedStyles(styles) {
  'worklet';

  if (typeof styles !== 'object') {
    throw new ReanimatedError(`\`useAnimatedStyle\` has to return an object, found ${typeof styles} instead.`);
  } else if (Array.isArray(styles)) {
    throw new ReanimatedError('`useAnimatedStyle` has to return an object and cannot return static styles combined with dynamic ones. Please do merging where a component receives props.');
  }
}
//# sourceMappingURL=utils.js.map