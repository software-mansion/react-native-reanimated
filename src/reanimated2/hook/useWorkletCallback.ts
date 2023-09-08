import { useCallback } from 'react';
import type { DependencyList } from 'react';
import type { WorkletFunction } from '../commonTypes';

// @ts-expect-error This is fine.
export function useWorkletCallback<Args extends unknown[], ReturnValue>(
  fun: (...args: Args) => ReturnValue,
  deps?: DependencyList
);

export function useWorkletCallback<Args extends unknown[], ReturnValue>(
  fun: WorkletFunction<Args, ReturnValue>,
  deps?: DependencyList
) {
  return useCallback(fun, deps ?? []);
}
