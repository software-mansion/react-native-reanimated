'use strict';

import { RuntimeKind } from 'react-native-worklets';
import { IS_JEST, logger, SHOULD_BE_USE_WEB } from "../common/index.js";
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

  if (globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
    return;
  }
  const shadowNodeWrapper = animatedRef();
  global._dispatchCommand(shadowNodeWrapper, commandName, args);
}
function dispatchCommandJest() {
  logger.warn('dispatchCommand() is not supported with Jest.');
}
function dispatchCommandDefault() {
  logger.warn('dispatchCommand() is not supported on this configuration.');
}
if (!SHOULD_BE_USE_WEB) {
  // Those assertions are actually correct since on Native platforms `AnimatedRef` is
  // mapped as a different function in `serializableMappingCache` and
  // TypeScript is not able to infer that.
  dispatchCommand = dispatchCommandNative;
} else if (IS_JEST) {
  dispatchCommand = dispatchCommandJest;
} else {
  dispatchCommand = dispatchCommandDefault;
}
//# sourceMappingURL=dispatchCommand.js.map