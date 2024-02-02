'use strict';
import { useCallback } from 'react';
import type { DependencyList } from './commonTypes';

/**
 * @deprecated don't use
 */
export function useWorkletCallback<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  deps?: DependencyList
) {
  return useCallback(worklet, deps ?? []);
}
