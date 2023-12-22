'use strict';
import type { ShadowNodeWrapper } from '../commonTypes';
import {
  isChromeDebugger,
  isFabric,
  isJest,
  shouldBeUseWeb,
} from '../PlatformChecker';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';

function dispatchCommandFabric<T extends Component>(
  animatedRef: AnimatedRef<T>,
  commandName: string,
  args: Array<unknown> = []
) {
  'worklet';
  if (!_WORKLET) {
    return;
  }

  const shadowNodeWrapper = animatedRef() as ShadowNodeWrapper;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  _dispatchCommandFabric!(shadowNodeWrapper, commandName, args);
}

function dispatchCommandPaper<T extends Component>(
  animatedRef: AnimatedRef<T>,
  commandName: string,
  args: Array<unknown> = []
) {
  'worklet';
  if (!_WORKLET) {
    return;
  }

  const viewTag = animatedRef() as number;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  _dispatchCommandPaper!(viewTag, commandName, args);
}

function dispatchCommandJest() {
  console.warn('[Reanimated] dispatchCommand() is not supported with Jest.');
}

function dispatchCommandChromeDebugger() {
  console.warn(
    '[Reanimated] dispatchCommand() is not supported with Chrome Debugger.'
  );
}

function dispatchCommandDefault() {
  console.warn(
    '[Reanimated] dispatchCommand() is not supported on this configuration.'
  );
}

/**
 * Lets you synchronously call a command of a native component.
 *
 * @param animatedRef - An [animated ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns) connected to the component you'd want to call the command on.
 * @param commandName - The name of the command to dispatch (e.g. `"focus"` or `"scrollToEnd"`).
 * @param args - An optional array of arguments for the command.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/dispatchCommand
 */
export let dispatchCommand: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  commandName: string,
  args?: Array<unknown>
) => void;
if (!shouldBeUseWeb()) {
  if (isFabric()) {
    dispatchCommand = dispatchCommandFabric;
  } else {
    dispatchCommand = dispatchCommandPaper;
  }
} else if (isJest()) {
  dispatchCommand = dispatchCommandJest;
} else if (isChromeDebugger()) {
  dispatchCommand = dispatchCommandChromeDebugger;
} else {
  dispatchCommand = dispatchCommandDefault;
}
