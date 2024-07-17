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

/**
 * 
 * Lets you define an array of objects which props can be shared values.
 * 
 * @param count - The number of objects in the array.
 * @param factory - A function that returns an object with props that can be shared values.
 * @param dependencies - An optional array of dependencies that will trigger the re-creation of shared values objects when changed (empty array by default).
 * @returns An array of objects with specific props as shared values.
 */
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
