'use strict';
import { useCallback } from 'react';
import type { DependencyList } from './commonTypes';

export function useWorkletCallback<A extends unknown[], R>(
  fun: (...args: A) => R,
  deps?: DependencyList
): (...args: Parameters<typeof fun>) => R {
  return useCallback(fun, deps ?? []);
}
