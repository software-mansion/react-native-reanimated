'use strict';
import type {
  NestedObjectValues,
  __WorkletFunction,
  AnimationObject,
} from '../commonTypes';
import type { AnimatedStyle } from '../helperTypes';
import type { DependencyList } from './commonTypes';

// builds one big hash from multiple worklets' hashes
export function buildWorkletsHash(
  handlers: Record<string, __WorkletFunction> | Array<__WorkletFunction>
): string {
  return Object.values(handlers).reduce(
    (acc: string, worklet: __WorkletFunction) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      acc + worklet.__workletHash!.toString(),
    ''
  );
}

// builds dependencies array for gesture handlers
export function buildDependencies(
  dependencies: DependencyList,
  handlers: Record<string, __WorkletFunction | undefined>
): Array<unknown> {
  const handlersList: __WorkletFunction[] = Object.values(handlers).filter(
    (handler) => handler !== undefined
  ) as __WorkletFunction[];
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

// this is supposed to work as useEffect comparison
export function areDependenciesEqual(
  nextDeps: DependencyList,
  prevDeps: DependencyList
): boolean {
  function is(x: number, y: number) {
    /* eslint-disable no-self-compare */
    return (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y);
    /* eslint-enable no-self-compare */
  }
  const objectIs: (nextDeps: unknown, prevDeps: unknown) => boolean =
    typeof Object.is === 'function' ? Object.is : is;

  function areHookInputsEqual(
    nextDeps: DependencyList,
    prevDeps: DependencyList
  ): boolean {
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

  return areHookInputsEqual(nextDeps, prevDeps);
}

export function isAnimated(prop: NestedObjectValues<AnimationObject>): boolean {
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

export function shallowEqual(a: any, b: any) {
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

export const validateAnimatedStyles = (styles: AnimatedStyle<any>): void => {
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
};
