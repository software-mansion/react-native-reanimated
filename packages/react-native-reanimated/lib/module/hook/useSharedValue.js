'use strict';

import { useEffect, useState } from 'react';
import { cancelAnimation } from "../animation/index.js";
import { makeMutable } from "../core.js";

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
export function useSharedValue(initialValue) {
  const [mutable] = useState(() => makeMutable(initialValue));
  useEffect(() => {
    return () => {
      cancelAnimation(mutable);
    };
  }, [mutable]);
  return mutable;
}
//# sourceMappingURL=useSharedValue.js.map