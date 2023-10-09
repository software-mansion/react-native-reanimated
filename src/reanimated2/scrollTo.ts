'use strict';
import { isChromeDebugger, isJest, shouldBeUseWeb } from './PlatformChecker';
import { dispatchCommand } from './dispatchCommand';
import type { AnimatedRef } from './hook/commonTypes';
import type { Component } from 'react';

const IS_NATIVE = !shouldBeUseWeb();

export let scrollTo: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  x: number,
  y: number,
  animated: boolean
) => void;
if (IS_NATIVE && global._IS_FABRIC) {
  scrollTo = (animatedRef, x, y, animated) => {
    'worklet';
    dispatchCommand(animatedRef as any, 'scrollTo', [x, y, animated]);
  };
} else if (IS_NATIVE) {
  scrollTo = (animatedRef, x, y, animated) => {
    'worklet';
    if (!_WORKLET) {
      return;
    }

    // Calling animatedRef on Paper returns a number (nativeTag)
    const viewTag = (animatedRef as any)() as number;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    _scrollToPaper!(viewTag, x, y, animated);
  };
} else if (isJest()) {
  scrollTo = () => {
    console.warn('[Reanimated] scrollTo() is not supported with Jest.');
  };
} else if (isChromeDebugger()) {
  scrollTo = () => {
    console.warn(
      '[Reanimated] scrollTo() is not supported with Chrome Debugger.'
    );
  };
} else {
  scrollTo = () => {
    console.warn(
      '[Reanimated] scrollTo() is not supported on this configuration.'
    );
  };
}
