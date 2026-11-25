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

    const errors: unknown[] = [];
    for (const callback of flushedCallbacks) {
      try {
        callback(timestamp);
      } catch (error) {
        errors.push(error);
      }
      try {
        globalThis.__drainMicrotasks();
      } catch (error) {
        errors.push(error);
      }
    }

    flushedCallbacksBegin = flushedCallbacksEnd;

    for (const error of errors) {
      setTimeout(() => {
        throw error;
      });
    }
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
