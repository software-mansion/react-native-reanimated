'use strict';

import { callMicrotasks } from '../../threads';

export function setupRequestAnimationFrame() {
  'worklet';
  const nativeRequestAnimationFrame = globalThis.requestAnimationFrame;

  let queuedCallbacks: ((timestamp: number) => void)[] = [];
  let queuedCallbacksBegin = 0;
  let queuedCallbacksEnd = 0;

  let flushedCallbacks = queuedCallbacks;
  let flushedCallbacksBegin = 0;
  let flushedCallbacksEnd = 0;

  let flushRequested = false;

  globalThis.__flushAnimationFrame = (timestamp: number) => {
    flushedCallbacks = queuedCallbacks;
    queuedCallbacks = [];

    flushedCallbacksBegin = queuedCallbacksBegin;
    flushedCallbacksEnd = queuedCallbacksEnd;
    queuedCallbacksBegin = queuedCallbacksEnd;

    for (const callback of flushedCallbacks) {
      callback(timestamp);
    }

    flushedCallbacksBegin = flushedCallbacksEnd;

    callMicrotasks();
  };

  globalThis.requestAnimationFrame = (
    callback: (timestamp: number) => void
  ): number => {
    const handle = queuedCallbacksEnd++;

    queuedCallbacks.push(callback);
    if (!flushRequested) {
      flushRequested = true;

      nativeRequestAnimationFrame((timestamp) => {
        flushRequested = false;
        globalThis.__frameTimestamp = timestamp;
        globalThis.__flushAnimationFrame(timestamp);
        globalThis.__frameTimestamp = undefined;
      });
    }
    return handle;
  };

  globalThis.cancelAnimationFrame = (handle: number) => {
    if (handle < flushedCallbacksBegin || handle >= queuedCallbacksEnd) {
      return;
    }

    if (handle < flushedCallbacksEnd) {
      flushedCallbacks[handle - flushedCallbacksBegin] = () => {};
    } else {
      queuedCallbacks[handle - queuedCallbacksBegin] = () => {};
    }
  };
}
