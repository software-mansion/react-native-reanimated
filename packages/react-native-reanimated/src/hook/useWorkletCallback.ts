'use strict';
import { useCallback } from 'react';

import type { DependencyList } from './commonTypes';

/** @deprecated Use React.useCallback instead */
export function useWorkletCallback<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  deps?: DependencyList
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(worklet, deps ?? []);
}
