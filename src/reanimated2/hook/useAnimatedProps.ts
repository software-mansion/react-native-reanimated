'use strict';
import { useAnimatedStyle } from './useAnimatedStyle';
import type { DependencyList } from './commonTypes';
import type {
  AnimatedPropsAdapterFunction,
  useAnimatedPropsType,
} from '../helperTypes';
import { shouldBeUseWeb } from '../PlatformChecker';

// TODO: we should make sure that when useAP is used we are not assigning styles
// when you need styles to animated you should always use useAS
// TODO TYPESCRIPT This is a temporary cast to get rid of .d.ts file.

/**
 * Lets you create an animated props object which can be animated using shared values.
 *
 * @param updater - A function returning an object with properties you want to animate.
 * @param dependencies - An optional array of dependencies. Only relevant when using Reanimated without the Babel plugin on the Web.
 * @param adapters - An optional function or array of functions allowing to adopt prop naming between JS and the native side.
 * @returns An animated props object which has to be passed to `animatedProps` property of an Animated component that you want to animate.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps
 */
export let useAnimatedProps: useAnimatedPropsType;

if (shouldBeUseWeb()) {
  useAnimatedProps = function <T extends object>(
    updater: () => Partial<T>,
    deps?: DependencyList | null,
    adapters?:
      | AnimatedPropsAdapterFunction
      | AnimatedPropsAdapterFunction[]
      | null
  ) {
    return (useAnimatedStyle as useAnimatedPropsType)(
      updater,
      deps,
      adapters,
      true
    );
  };
} else {
  useAnimatedProps = useAnimatedStyle as useAnimatedPropsType;
}
