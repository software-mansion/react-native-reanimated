import { useEffect, useRef } from "react";
import type { SharedValue } from "../commonTypes";
import { cancelAnimations } from "../animation/util";
import { makeMutables } from "../mutables";

/**
 * Lets you define the array of [shared values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value) of the same type in your components.
 * 
 * @param count - The number of shared values in the array.
 * @param initialValue - The value you want to be initially stored to a `.value` property.
 * @param reset - If `true`, cancels all animations and resets the array of shared values on re-render.
 * @returns An array of shared values with a `.value` property initially set to the `initialValue` - {@link SharedValue}.
 */
export function useSharedValues<Value>(
  count: number,
  initialValue: Value,
  reset?: boolean
): SharedValue<Value>[] {
  const valuesRef = useRef<SharedValue<Value>[]>([]);

  useEffect(() => {
    return () => {
      cancelAnimations(valuesRef.current);
    };
  }, []);

  if (reset) {
    cancelAnimations(valuesRef.current);
    valuesRef.current = makeMutables(count, initialValue);
    return valuesRef.current;
  }

  const currentValues = valuesRef.current;
  if (count < currentValues.length) {
    cancelAnimations(currentValues.slice(count));
    valuesRef.current = currentValues.slice(0, count);
  } else if (count > currentValues.length) {
    const newValues = makeMutables(count - currentValues.length, initialValue);
    valuesRef.current = [...currentValues, ...newValues];
  }

  return valuesRef.current;
}
