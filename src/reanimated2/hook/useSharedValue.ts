'use strict';
import { useEffect, useRef } from 'react';
import { cancelAnimation } from '../animation';
import type { SharedValue } from '../commonTypes';
import { makeMutable } from '../core';

/**
 * Lets you define [shared values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value) in your components.
 *
 * @param initialValue - The value you want to be initially stored to a `.value` property.
 * @returns A shared value with a single `.value` property initially set to the `initialValue` - {@link SharedValue}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue
 */
export function useSharedValue<Value>(
  initialValue: Value,
  oneWayReadsOnly = false
): SharedValue<Value> {
  const ref = useRef<SharedValue<Value>>(
    makeMutable(initialValue, oneWayReadsOnly)
  );

  if (ref.current === null) {
    ref.current = makeMutable(initialValue, oneWayReadsOnly);
  }

  useEffect(() => {
    return () => {
      cancelAnimation(ref.current);
    };
  }, []);

  return ref.current;
}
