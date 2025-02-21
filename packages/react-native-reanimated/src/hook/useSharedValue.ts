'use strict';
import { useEffect, useState } from 'react';

import { cancelAnimation } from '../animation';
import type { SharedValue } from '../commonTypes';
import { makeMutable } from '../core';

/**
 * Lets you define [shared
 * values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value)
 * in your components.
 *
 * @param initialValue - The value you want to be initially stored to a `.value`
 *   property.
 * @returns A shared value with a single `.value` property initially set to the
 *   `initialValue` - {@link SharedValue}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue
 */
export function useSharedValue<Value>(initialValue: Value): SharedValue<Value> {
  const [mutable] = useState(() => makeMutable(initialValue));
  useEffect(() => {
    return () => {
      cancelAnimation(mutable);
    };
  }, [mutable]);
  return mutable;
}
