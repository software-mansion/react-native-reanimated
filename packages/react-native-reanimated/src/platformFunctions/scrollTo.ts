'use strict';
import type { Component } from 'react';

import type {
  AnimatedRef,
  AnimatedRefOnJS,
  AnimatedRefOnUI,
} from '../hook/commonTypes';
import { logger } from '../logger';
import {
  isChromeDebugger,
  isFabric,
  isJest,
  shouldBeUseWeb,
} from '../PlatformChecker';
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

function scrollToFabric(
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

function scrollToPaper(
  animatedRef: AnimatedRefOnJS | AnimatedRefOnUI,
  x: number,
  y: number,
  animated: boolean
) {
  'worklet';
  if (!_WORKLET) {
    return;
  }

  const viewTag = animatedRef() as number;
  global._scrollToPaper!(viewTag, x, y, animated);
}

function scrollToJest() {
  logger.warn('scrollTo() is not supported with Jest.');
}

function scrollToChromeDebugger() {
  logger.warn('scrollTo() is not supported with Chrome Debugger.');
}

function scrollToDefault() {
  logger.warn('scrollTo() is not supported on this configuration.');
}

if (!shouldBeUseWeb()) {
  // Those assertions are actually correct since on Native platforms `AnimatedRef` is
  // mapped as a different function in `shareableMappingCache` and
  // TypeScript is not able to infer that.
  if (isFabric()) {
    scrollTo = scrollToFabric as unknown as ScrollTo;
  } else {
    scrollTo = scrollToPaper as unknown as ScrollTo;
  }
} else if (isJest()) {
  scrollTo = scrollToJest;
} else if (isChromeDebugger()) {
  scrollTo = scrollToChromeDebugger;
} else {
  scrollTo = scrollToDefault;
}
