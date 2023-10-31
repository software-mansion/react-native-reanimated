'use strict';
import { useCallback } from 'react';
import type { DependencyList } from './commonTypes';
import type { WorkletFunction } from '../commonTypes';

export function useWorkletCallback<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  deps?: DependencyList
) {
  return useCallback(
    worklet,
    deps ?? Object.values((worklet as WorkletFunction).__closure)
  );
}
