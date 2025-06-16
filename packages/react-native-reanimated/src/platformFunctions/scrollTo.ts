'use strict';
import type { Component } from 'react';

import { IS_JEST, logger, SHOULD_BE_USE_WEB } from '../common';
import type {
  AnimatedRef,
  AnimatedRefOnJS,
  AnimatedRefOnUI,
} from '../hook/commonTypes';
import { dispatchCommand } from './dispatchCommand';

type ScrollTo = <T extends Component>(
  animatedRef: AnimatedRef<T>,
  x: number,
  y: number,
  animated: boolean
) => void;

/**
 * Lets you synchronously scroll to a given position of a `ScrollView`.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef)
 *   attached to an `Animated.ScrollView` component.
 * @param x - The x position you want to scroll to.
 * @param y - The y position you want to scroll to.
 * @param animated - Whether the scrolling should be smooth or instant.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/scroll/scrollTo
 */
export let scrollTo: ScrollTo;

function scrollToNative(
  animatedRef: AnimatedRefOnJS | AnimatedRefOnUI,
  x: number,
  y: number,
  animated: boolean
) {
  'worklet';
  dispatchCommand(
    // This assertion is needed to comply to `dispatchCommand` interface
    animatedRef as unknown as AnimatedRef<Component>,
    'scrollTo',
    [x, y, animated]
  );
}

function scrollToJest() {
  logger.warn('scrollTo() is not supported with Jest.');
}

function scrollToDefault() {
  logger.warn('scrollTo() is not supported on this configuration.');
}

if (!SHOULD_BE_USE_WEB) {
  // Those assertions are actually correct since on Native platforms `AnimatedRef` is
  // mapped as a different function in `shareableMappingCache` and
  // TypeScript is not able to infer that.
  scrollTo = scrollToNative as unknown as ScrollTo;
} else if (IS_JEST) {
  scrollTo = scrollToJest;
} else {
  scrollTo = scrollToDefault;
}
