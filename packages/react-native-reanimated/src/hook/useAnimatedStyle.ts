'use strict';

import type { WorkletFunction } from 'react-native-worklets';

import type { AnimatedPropsAdapterWorklet } from '../commonTypes';
import type {
  AnimatedStyleHandle,
  DefaultStyle,
  DependencyList,
} from './commonTypes';
import { useAnimatedUpdaterInternal } from './useAnimatedUpdaterInternal';

const HOOK_NAME = 'useAnimatedStyle';

/**
 * Lets you create a styles object, similar to StyleSheet styles, which can be
 * animated using shared values.
 *
 * @param updater - A function returning an object with style properties you
 *   want to animate.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @returns An animated style object which has to be passed to the `style`
 *   property of an Animated component you want to animate.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle
 */
export function useAnimatedStyle<TStyle extends DefaultStyle>(
  updater: WorkletFunction<[], TStyle> | (() => TStyle),
  dependencies?: DependencyList | null
): AnimatedStyleHandle<TStyle>;

/**
 * @deprecated The `adapters` parameter is deprecated and will be removed in a
 *   future version.
 */
export function useAnimatedStyle<TStyle extends DefaultStyle>(
  updater: WorkletFunction<[], TStyle> | (() => TStyle),
  dependencies?: DependencyList | null,
  adapters?: AnimatedPropsAdapterWorklet | AnimatedPropsAdapterWorklet[] | null
): AnimatedStyleHandle<TStyle>;

export function useAnimatedStyle<TStyle extends DefaultStyle>(
  updater: WorkletFunction<[], TStyle> | (() => TStyle),
  dependencies?: DependencyList | null,
  adapters?: AnimatedPropsAdapterWorklet | AnimatedPropsAdapterWorklet[] | null
): AnimatedStyleHandle<TStyle> {
  return useAnimatedUpdaterInternal(
    HOOK_NAME,
    updater,
    dependencies,
    adapters,
    false
  );
}
