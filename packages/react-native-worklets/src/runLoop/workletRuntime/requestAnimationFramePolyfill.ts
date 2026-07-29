'use strict';

export function setupRequestAnimationFrame(animationQueuePollingRate: number) {
  'worklet';
  const timeoutInterval = animationQueuePollingRate;

  let queuedCallbacks: ((timestamp: number) => void)[] = [];
  let queuedCallbacksBegin = 0;
  let queuedCallbacksEnd = 0;

  let flushedCallbacks = queuedCallbacks;
  let flushedCallbacksBegin = 0;
  let flushedCallbacksEnd = 0;

  let flushRequested = false;

  function flushAnimationFrame() {
    flushRequested = false;
    const timestamp = performance.now();

    flushedCallbacks = queuedCallbacks;
    queuedCallbacks = [];

    flushedCallbacksBegin = queuedCallbacksBegin;
    flushedCallbacksEnd = queuedCallbacksEnd;
    queuedCallbacksBegin = queuedCallbacksEnd;

    const lastCallbackIndex = flushedCallbacks.length - 1;
    for (let index = 0; index <= lastCallbackIndex; index++) {
      flushedCallbacks[index](timestamp);
      if (index < lastCallbackIndex) {
        // Last microtask drain is performed in C++ to trigger Hermes microtasks drain.
        globalThis.__callMicrotasks();
      }
    }

    flushedCallbacksBegin = flushedCallbacksEnd;
  }

  globalThis.requestAnimationFrame = (
    callback: (timestamp: number) => void
  ): number => {
    const handle = queuedCallbacksEnd++;

    queuedCallbacks.push(callback);
    if (!flushRequested) {
      flushRequested = true;

      setTimeout(flushAnimationFrame, timeoutInterval);
    }
    return handle;
  };

  globalThis.cancelAnimationFrame = ((handle: number) => {
    if (handle < flushedCallbacksBegin || handle >= queuedCallbacksEnd) {
      return;
    }

    if (handle < flushedCallbacksEnd) {
      flushedCallbacks[handle - flushedCallbacksBegin] = () => {};
    } else {
      queuedCallbacks[handle - queuedCallbacksBegin] = () => {};
    }
  }) as typeof globalThis.cancelAnimationFrame;
}
