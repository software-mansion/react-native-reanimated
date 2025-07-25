'use strict';
import { SHOULD_BE_USE_WEB } from '../common';
import type {
  AnimatedPropsAdapterFunction,
  AnimatedStyleHandle,
} from '../commonTypes';
import type { AnyRecord } from '../css/types';
import type { OmitStyleProps } from '../helperTypes';
import type { DependencyList, UseAnimatedStyleInternal } from './commonTypes';
import { useAnimatedStyle } from './useAnimatedStyle';

type AnimatedPropsHandle<Props extends AnyRecord> = AnimatedStyleHandle<
  OmitStyleProps<Props>
>;

type UseAnimatedProps = <Props extends AnyRecord>(
  updater: () => Partial<OmitStyleProps<Props>>,
  dependencies?: DependencyList | null,
  adapters?:
    | AnimatedPropsAdapterFunction
    | AnimatedPropsAdapterFunction[]
    | null,
  isAnimatedProps?: boolean
) => AnimatedPropsHandle<Props>;

function useAnimatedPropsJS<Props extends AnyRecord>(
  updater: () => Partial<OmitStyleProps<Props>>,
  deps?: DependencyList | null,
  adapters?:
    | AnimatedPropsAdapterFunction
    | AnimatedPropsAdapterFunction[]
    | null
) {
  return (
    useAnimatedStyle as UseAnimatedStyleInternal<Partial<OmitStyleProps<Props>>>
  )(updater, deps, adapters, true);
}

const useAnimatedPropsNative = useAnimatedStyle;

/**
 * Lets you create an animated props object which can be animated using shared
 * values.
 *
 * @param updater - A function returning an object with properties you want to
 *   animate.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @param adapters - An optional function or array of functions allowing to
 *   adopt prop naming between JS and the native side.
 * @returns An animated props object which has to be passed to `animatedProps`
 *   property of an Animated component that you want to animate.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps
 */
export const useAnimatedProps: UseAnimatedProps = SHOULD_BE_USE_WEB
  ? useAnimatedPropsJS
  : (useAnimatedPropsNative as UseAnimatedProps);
