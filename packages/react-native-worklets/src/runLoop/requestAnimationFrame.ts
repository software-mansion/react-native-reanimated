'use strict';

import { callMicrotasks } from '../threads';

export function setupRequestAnimationFrame() {
  'worklet';
  const nativeRequestAnimationFrame = globalThis.requestAnimationFrame;

  let animationFrameCallbacks: ((timestamp: number) => void)[] = [];
  let callbacksBegin = 0;
  let callbacksEnd = 0;

  let flushedCallbacks = animationFrameCallbacks;
  let flushedCallbacksBegin = 0;
  let flushedCallbacksEnd = 0;

  let flushRequested = false;

  globalThis.__flushAnimationFrame = (timestamp: number) => {
    globalThis.__frameTimestamp = timestamp;

    flushedCallbacks = animationFrameCallbacks;
    animationFrameCallbacks = [];

    flushedCallbacksBegin = callbacksBegin;
    flushedCallbacksEnd = callbacksEnd;
    callbacksBegin = callbacksEnd;

    flushRequested = false;

    for (const callback of flushedCallbacks) {
      callback(timestamp);
    }

    flushedCallbacksBegin = callbacksEnd;

    callMicrotasks();

    globalThis.__frameTimestamp = undefined;
  };

  globalThis.requestAnimationFrame = (
    callback: (timestamp: number) => void
  ): number => {
    const handle = callbacksEnd++;

    animationFrameCallbacks.push(callback);
    if (!flushRequested) {
      flushRequested = true;

      nativeRequestAnimationFrame(globalThis.__flushAnimationFrame);
    }
    return handle;
  };

  globalThis.cancelAnimationFrame = (handle: number) => {
    if (handle < flushedCallbacksBegin || handle >= callbacksEnd) {
      return;
    }

    if (handle < flushedCallbacksEnd) {
      flushedCallbacks[handle - flushedCallbacksBegin] = () => {};
    } else {
      animationFrameCallbacks[handle - callbacksBegin] = () => {};
    }
  };
}
