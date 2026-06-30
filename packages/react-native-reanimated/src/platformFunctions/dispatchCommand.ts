'use strict';
import { IS_JEST, logger } from '../common';
import type { DispatchCommand } from './types';

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
export let dispatchCommand: DispatchCommand;

function dispatchCommandJest() {
  logger.warn('dispatchCommand() is not supported with Jest.');
}

function dispatchCommandDefault() {
  logger.warn('dispatchCommand() is not supported on this configuration.');
}

if (IS_JEST) {
  dispatchCommand = dispatchCommandJest;
} else {
  dispatchCommand = dispatchCommandDefault;
}
