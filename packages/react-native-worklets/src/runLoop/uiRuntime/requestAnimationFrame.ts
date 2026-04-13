'use strict';

export function setupRequestAnimationFrame() {
  'worklet';
  const nativeRequestAnimationFrame = globalThis.requestAnimationFrame;
  const callMicrotasks = globalThis.__callMicrotasks;

  let queuedCallbacks: ((timestamp: number) => void)[] = [];
  let queuedCallbacksBegin = 0;
  let queuedCallbacksEnd = 0;

  let flushedCallbacks = queuedCallbacks;
  let flushedCallbacksBegin = 0;
  let flushedCallbacksEnd = 0;

  function executeQueue(timestamp: number) {
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
  }

  function requestAnimationFrame(
    callback: (timestamp: number) => void
  ): number {
    const handle = queuedCallbacksEnd++;
    queuedCallbacks.push(callback);
    return handle;
  }

  function cancelAnimationFrame(handle: number) {
    if (handle < flushedCallbacksBegin || handle >= queuedCallbacksEnd) {
      return;
    }

    if (handle < flushedCallbacksEnd) {
      flushedCallbacks[handle - flushedCallbacksBegin] = () => {};
    } else {
      queuedCallbacks[handle - queuedCallbacksBegin] = () => {};
    }
  }

  function nativeFlushQueue(timestamp: number) {
    flushQueue(timestamp);

    /* Schedule next frame */
    nativeRequestAnimationFrame(nativeFlushQueue);
  }

  function flushQueue(timestamp: number) {
    globalThis.__frameTimestamp = timestamp;
    executeQueue(timestamp);
    globalThis.__frameTimestamp = undefined;
  }

  globalThis.requestAnimationFrame = requestAnimationFrame;
  globalThis.cancelAnimationFrame =
    cancelAnimationFrame as typeof globalThis.cancelAnimationFrame;
  globalThis.__flushAnimationFrame = (eventTimestamp: number) => {
    // TODO: Remove this in the future.
    // Reanimated uses this method to trigger event synchronously.
    flushQueue(eventTimestamp);
  };

  /* Start the loop */
  nativeRequestAnimationFrame(nativeFlushQueue);
}
