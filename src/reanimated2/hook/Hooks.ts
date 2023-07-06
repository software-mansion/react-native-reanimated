import { useCallback } from 'react';
import { useAnimatedStyle } from './useAnimatedStyle';
import type { DependencyList } from './commonTypes';
import type { useAnimatedPropsType } from '../helperTypes';

// TODO: we should make sure that when useAP is used we are not assigning styles
// when you need styles to animated you should always use useAS
// TODO TYPESCRIPT This is a temporary cast to get rid of .d.ts file.
export const useAnimatedProps = useAnimatedStyle as useAnimatedPropsType;

export function useWorkletCallback<A extends unknown[], R>(
  fun: (...args: A) => R,
  deps?: DependencyList
): (...args: Parameters<typeof fun>) => R {
  return useCallback(fun, deps ?? []);
}

export { useEvent, useHandler } from './utils';
