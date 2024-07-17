/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useEffect } from 'react';
import { cancelAnimations } from '../animation/util';
import type { SharedValue } from '../commonTypes';
import type { DependencyList } from './commonTypes';
import {
  makeSharedValuesObjectRecursive,
  mutable,
} from './useSharedValuesObject';
import type { SharedValuesObject, Simplify } from './useSharedValuesObject';

export type SharedValuesObjectsFactoryParams = {
  mutable: typeof mutable;
  index: number;
};

export function useSharedValuesObjects<Obj extends Record<string, any>>(
  count: number,
  factory: (params: SharedValuesObjectsFactoryParams) => Obj,
  dependencies: DependencyList = []
): Array<Simplify<SharedValuesObject<Obj>>> {
  const resultRef = useRef<Array<SharedValuesObject<Obj>>>();
  const mutableValuesRef = useRef<Array<Array<SharedValue>>>([]);
  const prevDependenciesRef = useRef<DependencyList>();

  useEffect(() => {
    return () => {
      cancelAnimations(mutableValuesRef.current.flat());
    };
  }, []);

  if (
    dependencies.some((dep, i) => dep !== prevDependenciesRef.current?.[i]) ||
    !resultRef.current
  ) {
    prevDependenciesRef.current = dependencies;
    cancelAnimations(mutableValuesRef.current.flat());
    mutableValuesRef.current = [];
    const results = Array.from({ length: count }, (_, index) => {
      const { result, mutableValues } = makeSharedValuesObjectRecursive(
        factory({ mutable, index }),
        []
      );
      mutableValuesRef.current.push(mutableValues);
      return result;
    });
    resultRef.current = results;
    return results;
  }

  const currentResults = resultRef.current;
  if (count < currentResults.length) {
    cancelAnimations(mutableValuesRef.current.splice(count).flat());
    resultRef.current = currentResults.slice(0, count);
  } else if (count > currentResults.length) {
    const newResults = Array.from(
      { length: count - currentResults.length },
      (_, index) => {
        const { result, mutableValues } = makeSharedValuesObjectRecursive(
          factory({ mutable, index: currentResults.length + index }),
          []
        );
        mutableValuesRef.current.push(mutableValues);
        return result;
      }
    );
    resultRef.current = [...currentResults, ...newResults];
  }

  return resultRef.current;
}
