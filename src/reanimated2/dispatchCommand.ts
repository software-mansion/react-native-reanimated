'use strict';
import type { ShadowNodeWrapper } from './commonTypes';
import { isChromeDebugger, isJest, shouldBeUseWeb } from './PlatformChecker';
import type { AnimatedRef } from './hook/commonTypes';
import type { Component } from 'react';

const IS_NATIVE = !shouldBeUseWeb();

export let dispatchCommand: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  commandName: string,
  args?: Array<unknown>
) => void;
if (IS_NATIVE && global._IS_FABRIC) {
  dispatchCommand = (animatedRef, commandName, args = []) => {
    'worklet';
    if (!_WORKLET) {
      return;
    }

    const shadowNodeWrapper = animatedRef() as ShadowNodeWrapper;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    _dispatchCommandFabric!(shadowNodeWrapper, commandName, args);
  };
} else if (IS_NATIVE) {
  dispatchCommand = (animatedRef, commandName, args = []) => {
    'worklet';
    if (!_WORKLET) {
      return;
    }

    const viewTag = animatedRef() as number;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    _dispatchCommandPaper!(viewTag, commandName, args);
  };
} else if (isJest()) {
  dispatchCommand = () => {
    console.warn('[Reanimated] dispatchCommand() is not supported with Jest.');
  };
} else if (isChromeDebugger()) {
  dispatchCommand = () => {
    console.warn(
      '[Reanimated] dispatchCommand() is not supported with Chrome Debugger.'
    );
  };
} else {
  dispatchCommand = () => {
    console.warn(
      '[Reanimated] dispatchCommand() is not supported on this configuration.'
    );
  };
}
