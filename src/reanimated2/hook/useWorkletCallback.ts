import { useCallback } from 'react';
import type { DependencyList } from 'react';

export function useWorkletCallback<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  deps?: DependencyList
) {
  return useCallback(worklet, deps ?? []);
}
