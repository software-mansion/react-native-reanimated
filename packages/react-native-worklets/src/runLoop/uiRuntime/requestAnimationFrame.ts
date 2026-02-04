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

  function flushQueue(timestamp: number) {
    globalThis.__frameTimestamp = timestamp;
    executeQueue(timestamp);
    globalThis.__frameTimestamp = undefined;

    /* Schedule next frame */
    nativeRequestAnimationFrame(flushQueue);
  }

  globalThis.requestAnimationFrame = requestAnimationFrame;
  globalThis.cancelAnimationFrame = cancelAnimationFrame;
  globalThis.__flushAnimationFrame = () => {
    // NOOP for backwards compatibility
  };

  /* Start the loop */
  nativeRequestAnimationFrame(flushQueue);
}
