'use strict';

import { logger } from 'react-native-worklets';
import { processColorsInProps } from "../Colors.js";
import { isChromeDebugger, isJest, shouldBeUseWeb } from "../PlatformChecker.js";
/**
 * Lets you imperatively update component properties. You should always reach
 * for
 * [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle)
 * and
 * [useAnimatedProps](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps)
 * first when animating styles or properties.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns)
 *   connected to the component you'd want to update.
 * @param updates - An object with properties you want to update.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/setNativeProps
 */
export let setNativeProps;
function setNativePropsNative(animatedRef, updates) {
  'worklet';

  if (!globalThis._WORKLET) {
    logger.warn('setNativeProps() can only be used on the UI runtime.');
    return;
  }
  const shadowNodeWrapper = animatedRef();
  processColorsInProps(updates);
  global._updateProps([{
    shadowNodeWrapper,
    updates
  }]);
}
function setNativePropsJest() {
  logger.warn('setNativeProps() is not supported with Jest.');
}
function setNativePropsChromeDebugger() {
  logger.warn('setNativeProps() is not supported with Chrome Debugger.');
}
function setNativePropsDefault() {
  logger.warn('setNativeProps() is not supported on this configuration.');
}
if (!shouldBeUseWeb()) {
  // Those assertions are actually correct since on Native platforms `AnimatedRef` is
  // mapped as a different function in `shareableMappingCache` and
  // TypeScript is not able to infer that.
  setNativeProps = setNativePropsNative;
} else if (isJest()) {
  setNativeProps = setNativePropsJest;
} else if (isChromeDebugger()) {
  setNativeProps = setNativePropsChromeDebugger;
} else {
  setNativeProps = setNativePropsDefault;
}
//# sourceMappingURL=setNativeProps.js.map