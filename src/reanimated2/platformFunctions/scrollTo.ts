'use strict';
import { isChromeDebugger, isJest, shouldBeUseWeb } from '../PlatformChecker';
import { dispatchCommand } from './dispatchCommand';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';

const IS_NATIVE = !shouldBeUseWeb();

export let scrollTo: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  x: number,
  y: number,
  animated: boolean
) => void;

function scrollToFabric<T extends Component>(
  animatedRef: AnimatedRef<T>,
  x: number,
  y: number,
  animated: boolean
) {
  'worklet';
  dispatchCommand(animatedRef as any, 'scrollTo', [x, y, animated]);
}

function scrollToPaper<T extends Component>(
  animatedRef: AnimatedRef<T>,
  x: number,
  y: number,
  animated: boolean
) {
  'worklet';
  if (!_WORKLET) {
    return;
  }

  // Calling animatedRef on Paper returns a number (nativeTag)
  const viewTag = (animatedRef as any)() as number;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  _scrollToPaper!(viewTag, x, y, animated);
}

function scrollToJest() {
  console.warn('[Reanimated] scrollTo() is not supported with Jest.');
}

function scrollToChromeDebugger() {
  console.warn(
    '[Reanimated] scrollTo() is not supported with Chrome Debugger.'
  );
}

function scrollToDefault() {
  console.warn(
    '[Reanimated] scrollTo() is not supported on this configuration.'
  );
}

if (IS_NATIVE && global._IS_FABRIC) {
  scrollTo = scrollToFabric;
} else if (IS_NATIVE) {
  scrollTo = scrollToPaper;
} else if (isJest()) {
  scrollTo = scrollToJest;
} else if (isChromeDebugger()) {
  scrollTo = scrollToChromeDebugger;
} else {
  scrollTo = scrollToDefault;
}
