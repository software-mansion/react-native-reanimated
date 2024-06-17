'use strict';
import type { WorkletFunction } from '../commonTypes';
import type { DependencyList } from './commonTypes';

// Builds one big hash from multiple worklets' hashes.
export function buildWorkletsHash<Args extends unknown[], ReturnValue>(
  worklets:
    | Record<string, WorkletFunction<Args, ReturnValue>>
    | WorkletFunction<Args, ReturnValue>[]
) {
  // For arrays `Object.values` returns the array itself.
  return Object.values(worklets).reduce(
    (acc, worklet: WorkletFunction<Args, ReturnValue>) =>
      acc + worklet.__workletHash.toString(),
    ''
  );
}

// Builds dependencies array for useEvent handlers.
export function buildDependencies(
  dependencies: DependencyList,
  handlers: Record<string, WorkletFunction | undefined>
) {
  type Handler = (typeof handlers)[keyof typeof handlers];
  const handlersList = Object.values(handlers).filter(
    (handler) => handler !== undefined
  ) as NonNullable<Handler>[];
  if (!dependencies) {
    dependencies = handlersList.map((handler) => {
      return {
        workletHash: handler.__workletHash,
        closure: handler.__closure,
      };
    });
  } else {
    dependencies.push(buildWorkletsHash(handlersList));
  }

  return dependencies;
}

// This is supposed to work as useEffect comparison.
export function areDependenciesEqual(
  nextDependencies: DependencyList,
  prevDependencies: DependencyList
) {
  function is(x: number, y: number) {
    return (
      (x === y && (x !== 0 || 1 / x === 1 / y)) ||
      (Number.isNaN(x) && Number.isNaN(y))
    );
  }
  const objectIs: (nextDeps: unknown, prevDeps: unknown) => boolean =
    typeof Object.is === 'function' ? Object.is : is;

  function areHookInputsEqual(
    nextDeps: DependencyList,
    prevDeps: DependencyList
  ) {
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
  T extends Record<string | number | symbol, unknown>
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
