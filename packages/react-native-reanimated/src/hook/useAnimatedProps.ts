'use strict';

import type { WorkletFunction } from 'react-native-worklets';

import type { AnimatedPropsAdapterWorklet } from '../commonTypes';
import type { AnimatedPropsHandle, DependencyList } from './commonTypes';
import { useAnimatedUpdaterInternal } from './useAnimatedUpdaterInternal';

const HOOK_NAME = 'useAnimatedProps';

// TODO: we should make sure that when useAP is used we are not assigning styles

/**
 * Lets you create an animated props object which can be animated using shared
 * values.
 *
 * @param updater - A function returning an object with properties you want to
 *   animate.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @returns An animated props object which has to be passed to `animatedProps`
 *   property of an Animated component that you want to animate.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps
 */
export function useAnimatedProps<TProps extends object>(
  updater: WorkletFunction<[], TProps> | (() => TProps),
  dependencies?: DependencyList | null
): AnimatedPropsHandle<TProps>;

/**
 * @deprecated The `adapters` parameter is deprecated and will be removed in a
 *   future version.
 */
export function useAnimatedProps<TProps extends object>(
  updater: WorkletFunction<[], TProps> | (() => TProps),
  dependencies?: DependencyList | null,
  adapters?: AnimatedPropsAdapterWorklet | AnimatedPropsAdapterWorklet[] | null
): AnimatedPropsHandle<TProps>;

export function useAnimatedProps<TProps extends object>(
  updater: WorkletFunction<[], TProps> | (() => TProps),
  dependencies?: DependencyList | null,
  adapters?: AnimatedPropsAdapterWorklet | AnimatedPropsAdapterWorklet[] | null
): AnimatedPropsHandle<TProps> {
  return useAnimatedUpdaterInternal(
    HOOK_NAME,
    updater,
    dependencies,
    adapters,
    true
  );
}
