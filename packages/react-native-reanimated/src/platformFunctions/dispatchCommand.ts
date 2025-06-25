'use strict';
import type { Component } from 'react';

import { IS_JEST, logger, SHOULD_BE_USE_WEB } from '../common';
import type { ShadowNodeWrapper } from '../commonTypes';
import type {
  AnimatedRef,
  AnimatedRefOnJS,
  AnimatedRefOnUI,
} from '../hook/commonTypes';

type DispatchCommand = <T extends Component>(
  animatedRef: AnimatedRef<T>,
  commandName: string,
  args?: unknown[]
) => void;

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

function dispatchCommandNative(
  animatedRef: AnimatedRefOnJS | AnimatedRefOnUI,
  commandName: string,
  args: Array<unknown> = []
) {
  'worklet';
  if (!globalThis._WORKLET) {
    return;
  }

  const shadowNodeWrapper = animatedRef() as ShadowNodeWrapper;
  global._dispatchCommand!(shadowNodeWrapper, commandName, args);
}

function dispatchCommandJest() {
  logger.warn('dispatchCommand() is not supported with Jest.');
}

function dispatchCommandDefault() {
  logger.warn('dispatchCommand() is not supported on this configuration.');
}

if (!SHOULD_BE_USE_WEB) {
  // Those assertions are actually correct since on Native platforms `AnimatedRef` is
  // mapped as a different function in `shareableMappingCache` and
  // TypeScript is not able to infer that.
  dispatchCommand = dispatchCommandNative as unknown as DispatchCommand;
} else if (IS_JEST) {
  dispatchCommand = dispatchCommandJest;
} else {
  dispatchCommand = dispatchCommandDefault;
}
