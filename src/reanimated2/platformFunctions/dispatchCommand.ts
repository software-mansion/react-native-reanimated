'use strict';
import type { ShadowNodeWrapper } from '../commonTypes';
import { isChromeDebugger, isJest, shouldBeUseWeb } from '../PlatformChecker';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';

const IS_NATIVE = !shouldBeUseWeb();

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

export let dispatchCommand: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  commandName: string,
  args?: Array<unknown>
) => void;
if (IS_NATIVE && global._IS_FABRIC) {
  dispatchCommand = dispatchCommandFabric;
} else if (IS_NATIVE) {
  dispatchCommand = dispatchCommandPaper;
} else if (isJest()) {
  dispatchCommand = dispatchCommandJest;
} else if (isChromeDebugger()) {
  dispatchCommand = dispatchCommandChromeDebugger;
} else {
  dispatchCommand = dispatchCommandDefault;
}
