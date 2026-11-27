'use strict';

export function setupRequestAnimationFrame(
  animationQueuePollingRate: number,
  enableVSync: boolean
) {
  'worklet';
  const timeoutInterval = animationQueuePollingRate;

  let queuedCallbacks: ((timestamp: number) => void)[] = [];
  let queuedCallbacksBegin = 0;
  let queuedCallbacksEnd = 0;

  let flushedCallbacks = queuedCallbacks;
  let flushedCallbacksBegin = 0;
  let flushedCallbacksEnd = 0;

  let flushRequested = false;

  function flushAnimationFrame(timestamp: number) {
    flushRequested = false;

    flushedCallbacks = queuedCallbacks;
    queuedCallbacks = [];

    flushedCallbacksBegin = queuedCallbacksBegin;
    flushedCallbacksEnd = queuedCallbacksEnd;
    queuedCallbacksBegin = queuedCallbacksEnd;

    for (const callback of flushedCallbacks) {
      callback(timestamp);
      globalThis.__drainMicrotasks();
    }

    flushedCallbacksBegin = flushedCallbacksEnd;
  }

  function flushAnimationFrameOnTimeout() {
    flushAnimationFrame(performance.now());
  }

  if (enableVSync) {
    globalThis.__runAnimationFrameCallback = flushAnimationFrame;
  }

  globalThis.requestAnimationFrame = (
    callback: (timestamp: number) => void
  ): number => {
    const handle = queuedCallbacksEnd++;

    queuedCallbacks.push(callback);
    if (!flushRequested) {
      flushRequested = true;

      if (enableVSync) {
        globalThis._scheduleAnimationFrameCallback();
      } else {
        setTimeout(flushAnimationFrameOnTimeout, timeoutInterval);
      }
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
