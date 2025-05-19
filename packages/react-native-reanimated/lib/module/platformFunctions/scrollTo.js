'use strict';

import { logger } from 'react-native-worklets';
import { isChromeDebugger, isJest, shouldBeUseWeb } from "../PlatformChecker.js";
import { dispatchCommand } from './dispatchCommand';
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
export let scrollTo;
function scrollToNative(animatedRef, x, y, animated) {
  'worklet';

  dispatchCommand(
  // This assertion is needed to comply to `dispatchCommand` interface
  animatedRef, 'scrollTo', [x, y, animated]);
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
  scrollTo = scrollToNative;
} else if (isJest()) {
  scrollTo = scrollToJest;
} else if (isChromeDebugger()) {
  scrollTo = scrollToChromeDebugger;
} else {
  scrollTo = scrollToDefault;
}
//# sourceMappingURL=scrollTo.js.map