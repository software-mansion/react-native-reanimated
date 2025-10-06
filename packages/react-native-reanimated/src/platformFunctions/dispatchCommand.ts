'use strict';
import { RuntimeKind } from 'react-native-worklets';

import { IS_JEST, logger, SHOULD_BE_USE_WEB } from '../common';
import type { ShadowNodeWrapper, WrapperRef } from '../commonTypes';
import type {
  AnimatedRef,
  AnimatedRefOnJS,
  AnimatedRefOnUI,
} from '../hook/commonTypes';

type DispatchCommand = <TRef extends WrapperRef>(
  animatedRef: AnimatedRef<TRef>,
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
  if (globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
    return;
  }

  const shadowNodeWrapper = animatedRef();

  // This prevents crashes if ref has not been set yet
  if (!shadowNodeWrapper) {
    logger.warn(
      `Tried to dispatch command "${commandName}" with an uninitialized ref. Make sure to pass the animated ref to the component before using it.`
    );
    return;
  }

  global._dispatchCommand!(
    shadowNodeWrapper as ShadowNodeWrapper,
    commandName,
    args
  );
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
  dispatchCommand = dispatchCommandNative as unknown as DispatchCommand;
} else if (IS_JEST) {
  dispatchCommand = dispatchCommandJest;
} else {
  dispatchCommand = dispatchCommandDefault;
}
