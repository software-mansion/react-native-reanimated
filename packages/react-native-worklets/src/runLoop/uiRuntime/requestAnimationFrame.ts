'use strict';

export function setupRequestAnimationFrame() {
  'worklet';

  let queuedCallbacks: ((timestamp: number) => void)[] = [];
  let queuedCallbacksBegin = 0;
  let queuedCallbacksEnd = 0;

  let flushedCallbacks = queuedCallbacks;
  let flushedCallbacksBegin = 0;
  let flushedCallbacksEnd = 0;

  let queuedFinalizers: (() => void)[] = [];

  let frameRequested = false;
  let isFlushing = false;

  function executeQueue(timestamp: number) {
    flushedCallbacks = queuedCallbacks;
    queuedCallbacks = [];

    flushedCallbacksBegin = queuedCallbacksBegin;
    flushedCallbacksEnd = queuedCallbacksEnd;
    queuedCallbacksBegin = queuedCallbacksEnd;

    if (flushedCallbacks.length > 0) {
      for (const callback of flushedCallbacks) {
        callback(timestamp);
        globalThis.__drainMicrotasks();
      }
    } else {
      globalThis.__drainMicrotasks();
    }

    flushedCallbacksBegin = flushedCallbacksEnd;

    const finalizers = queuedFinalizers;
    queuedFinalizers = [];
    for (const finalizer of finalizers) {
      finalizer();
    }
    globalThis.__drainMicrotasks();
  }

  function requestAnimationFrame(
    callback: (timestamp: number) => void
  ): number {
    const handle = queuedCallbacksEnd++;
    queuedCallbacks.push(callback);
    requestFrame();
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

  function requestAnimationFrameFinalizer(callback: () => void) {
    queuedFinalizers.push(callback);
    requestFrame();
  }

  function requestFrame() {
    if (frameRequested || isFlushing) {
      return;
    }
    frameRequested = true;
    globalThis.__nativeRequestAnimationFrame(nativeFlushQueue);
  }

  function nativeFlushQueue(timestamp: number) {
    frameRequested = false;
    isFlushing = true;
    globalThis.__frameTimestamp = timestamp;
    try {
      executeQueue(timestamp);
    } finally {
      globalThis.__frameTimestamp = undefined;
      isFlushing = false;
      if (queuedCallbacks.length > 0 || queuedFinalizers.length > 0) {
        requestFrame();
      }
    }
  }

  globalThis.requestAnimationFrame = requestAnimationFrame;
  globalThis.cancelAnimationFrame =
    cancelAnimationFrame as typeof globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrameFinalizer = requestAnimationFrameFinalizer;
}
