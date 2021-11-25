import { useCallback, useCallback } from 'react';
import { DependencyList } from './commonTypes';
import { useAnimatedStyle } from './useAnimatedStyle';
import type {} from '../../'

// TODO: we should make sure that when useAP is used we are not assigning styles
// when you need styles to animated you should always use useAS
export const useAnimatedProps = useAnimatedStyle;

export function useWorkletCallback<A extends unknown[], R>(
  fun: (...args: A) => R,
  deps?: DependencyList
): (...args: Parameters<typeof fun>) => R {
  return useCallback(fun, deps ?? []);
}

/**
 * `useLayoutAnimation` just returns the memoized function, so it's just a typed helper with useCallback.
 */
export const useLayoutAnimation = useCallback

export { useEvent, useHandler } from './utils';
