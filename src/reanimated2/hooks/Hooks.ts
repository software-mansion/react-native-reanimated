import { useCallback } from 'react';
import { useAnimatedStyle } from './useAnimatedStyle';

// TODO: we should make sure that when useAP is used we are not assigning styles
// when you need styles to animated you should always use useAS
export const useAnimatedProps = useAnimatedStyle;

export function useWorkletCallback(fun, deps) {
  return useCallback(fun, deps);
}

export function createWorklet(fun) {
  return fun;
}
