'use strict';

import { callMicrotasks } from '../threads';

export function setupRequestAnimationFrame() {
  'worklet';
  const nativeRequestAnimationFrame = global.requestAnimationFrame;

  let animationFrameCallbacks: Array<(timestamp: number) => void> = [];
  let flushRequested = false;

  global.__flushAnimationFrame = (frameTimestamp: number) => {
    const currentCallbacks = animationFrameCallbacks;
    animationFrameCallbacks = [];
    currentCallbacks.forEach((f) => f(frameTimestamp));
    callMicrotasks();
  };

  global.requestAnimationFrame = (
    callback: (timestamp: number) => void
  ): number => {
    animationFrameCallbacks.push(callback);
    if (!flushRequested) {
      flushRequested = true;
      nativeRequestAnimationFrame((timestamp) => {
        flushRequested = false;
        global.__frameTimestamp = timestamp;
        global.__flushAnimationFrame(timestamp);
        global.__frameTimestamp = undefined;
      });
    }
    return animationFrameCallbacks.length - 1;
  };

  global.cancelAnimationFrame = (id: number) => {
    if (id < 0 || id >= animationFrameCallbacks.length) {
      return;
    }
    animationFrameCallbacks[id] = () => {};
  };
}
