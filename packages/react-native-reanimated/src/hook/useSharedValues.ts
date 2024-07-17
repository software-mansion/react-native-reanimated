import { useEffect, useRef } from 'react';
import type { SharedValue } from '../commonTypes';
import { cancelAnimations } from '../animation/util';
import { makeMutable } from '../mutables';
import type { DependencyList } from './commonTypes';

/**
 * Lets you define the array of [shared values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value) of the same type in your components.
 *
 * @param count - The number of shared values in the array.
 * @param initialValue - The initial value or a function that returns the initial value for each shared value.
 * @param dependencies - An optional array of dependencies that will trigger the re-creation of shared values when changed (empty array by default).
 * @returns An array of shared values with a `.value` property initially set to the `initialValue` - {@link SharedValue}.
 */
export function useSharedValues<Value>(
  count: number,
  initialValue: Value | ((params: { index: number }) => Value),
  dependencies: DependencyList = []
): Array<SharedValue<Value>> {
  const valuesRef = useRef<Array<SharedValue<Value>>>();
  const prevDependenciesRef = useRef<DependencyList>();

  useEffect(() => {
    return () => {
      cancelAnimations(valuesRef.current ?? []);
    };
  }, []);

  const createValue = (index: number) => {
    const value =
      initialValue instanceof Function ? initialValue({ index }) : initialValue;
    return makeMutable(value);
  };

  // Re-create shared values if dependencies change
  if (
    dependencies.some((dep, i) => dep !== prevDependenciesRef.current?.[i]) ||
    !valuesRef.current
  ) {
    prevDependenciesRef.current = dependencies;
    cancelAnimations(valuesRef.current ?? []);
    valuesRef.current = Array.from({ length: count }, (_, index) =>
      createValue(index)
    );
    return valuesRef.current;
  }

  // Add/remove only necessary shared values without re-creating existing
  // ones that are left unchanged
  const currentValues = valuesRef.current;
  if (count < currentValues.length) {
    cancelAnimations(currentValues.slice(count));
    valuesRef.current = currentValues.slice(0, count);
  } else if (count > currentValues.length) {
    const newValues = Array.from(
      { length: count - currentValues.length },
      (_, index) => createValue(currentValues.length + index)
    );
    valuesRef.current = [...currentValues, ...newValues];
  }

  return valuesRef.current;
}
