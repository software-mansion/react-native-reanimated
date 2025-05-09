'use strict';

import { logger } from 'react-native-worklets';
import { isChromeDebugger, isJest, shouldBeUseWeb } from "../PlatformChecker.js";
/**
 * Lets you synchronously call a command of a native component.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns)
 *   connected to the component you'd want to call the command on.
 * @param commandName - The name of the command to dispatch (e.g. `"focus"` or
 *   `"scrollToEnd"`).
 * @param args - An optional array of arguments for the command.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/dispatchCommand
 */
export let dispatchCommand;
function dispatchCommandNative(animatedRef, commandName, args = []) {
  'worklet';

  if (!globalThis._WORKLET) {
    return;
  }
  const shadowNodeWrapper = animatedRef();
  global._dispatchCommand(shadowNodeWrapper, commandName, args);
}
function dispatchCommandJest() {
  logger.warn('dispatchCommand() is not supported with Jest.');
}
function dispatchCommandChromeDebugger() {
  logger.warn('dispatchCommand() is not supported with Chrome Debugger.');
}
function dispatchCommandDefault() {
  logger.warn('dispatchCommand() is not supported on this configuration.');
}
if (!shouldBeUseWeb()) {
  // Those assertions are actually correct since on Native platforms `AnimatedRef` is
  // mapped as a different function in `shareableMappingCache` and
  // TypeScript is not able to infer that.
  dispatchCommand = dispatchCommandNative;
} else if (isJest()) {
  dispatchCommand = dispatchCommandJest;
} else if (isChromeDebugger()) {
  dispatchCommand = dispatchCommandChromeDebugger;
} else {
  dispatchCommand = dispatchCommandDefault;
}
//# sourceMappingURL=dispatchCommand.js.map