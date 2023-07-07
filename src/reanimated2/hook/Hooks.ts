import { useCallback, useEffect, useState } from 'react';
import { useAnimatedStyle } from './useAnimatedStyle';
import type { DependencyList } from './commonTypes';
import type { useAnimatedPropsType } from '../helperTypes';
import { AccessibilityInfo } from 'react-native';

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

export function useReducedMotion(): boolean {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  useEffect(() => {
    const handleChange = (isReduceMotionEnabled: boolean): void => {
      setShouldReduceMotion(isReduceMotionEnabled);
    };

    async function init(): Promise<void> {
      handleChange(await AccessibilityInfo.isReduceMotionEnabled());
    }
    init();

    const reduceMotionChangedlistener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      handleChange
    );

    return (): void => {
      reduceMotionChangedlistener.remove();
    };
  }, []);

  return shouldReduceMotion;
}

export { useEvent, useHandler } from './utils';
