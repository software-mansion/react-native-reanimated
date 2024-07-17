/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import type { SharedValue } from '../commonTypes';
import { cancelAnimations } from '../animation/util';
import { shouldBeUseWeb } from '../PlatformChecker';
import { makeMutable } from '../mutables';
import type { DependencyList } from './commonTypes';

const SHOULD_USE_WEB = shouldBeUseWeb();
const DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD = 30;

class Mutable<V> {
  value: V;
  constructor(value: V) {
    this.value = value;
  }
}

export function mutable<Value>(value: Value): Mutable<Value> {
  return new Mutable(value);
}

export type SharedValuesObjectFactoryParams = {
  mutable: typeof mutable;
};

export type SharedValuesObject<Obj extends Record<string, any>> = {
  [K in keyof Obj]: Obj[K] extends Mutable<infer V> ? SharedValue<V> : Obj[K];
};

export type Simplify<T> = {
  [K in keyof T]: T[K];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};

export function makeSharedValuesObjectRecursive<
  Obj extends Record<string, any>
>(
  obj: Obj,
  mutableValues: Array<SharedValue>,
  depth = 0
): {
  result: SharedValuesObject<Obj>;
  mutableValues: Array<SharedValue>;
} {
  if (SHOULD_USE_WEB) {
    return { result: obj, mutableValues };
  }
  if (depth > DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD) {
    throw new Error(
      '[Reanimated] Trying to create a shared value object from a cyclic object. This is not supported.'
    );
  }

  const result = {} as SharedValuesObject<Obj>;

  for (const key in obj) {
    const value = obj[key] as any;
    if (value instanceof Mutable) {
      const sharedValue = makeMutable(value.value);
      mutableValues.push(sharedValue);
      result[key] = sharedValue as any;
    } else if (typeof value === 'object') {
      const { result: deepResult, mutableValues: deepMutableValues } =
        makeSharedValuesObjectRecursive(value, mutableValues);
      result[key] = deepResult as any;
      mutableValues = deepMutableValues;
    } else {
      result[key] = value;
    }
  }

  return { result, mutableValues };
}

/**
 * Lets you define an object which props can be shared values.
 *
 * @param factory - A function that returns an object with props that can be shared values.
 * @param dependencies - An optional array of dependencies that will trigger the creation of a new shared values object (empty array by default).
 * @returns An object with props that can be shared values.
 */
export function useSharedValuesObject<Obj extends Record<string, any>>(
  factory: (params: SharedValuesObjectFactoryParams) => Obj,
  dependencies: DependencyList = []
): Simplify<SharedValuesObject<Obj>> {
  const resultRef = useRef<SharedValuesObject<Obj>>();
  const mutableValuesRef = useRef<Array<SharedValue>>([]);
  const prevDependenciesRef = useRef<DependencyList>();

  useEffect(() => {
    return () => {
      cancelAnimations(mutableValuesRef.current);
    };
  }, []);

  if (
    dependencies.some((dep, i) => dep !== prevDependenciesRef.current?.[i]) ||
    !resultRef.current
  ) {
    prevDependenciesRef.current = dependencies;
    cancelAnimations(mutableValuesRef.current);
    const { result, mutableValues } = makeSharedValuesObjectRecursive(
      factory({ mutable }),
      []
    );
    mutableValuesRef.current = mutableValues;
    resultRef.current = result;
  }

  return resultRef.current;
}
