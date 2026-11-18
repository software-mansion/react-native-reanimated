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

  /*
   * The native frame is requested only while there is work for it: a queued
   * callback, a queued finalizer, or a microtask queued outside of a task that
   * drains them. An idle UI runtime doesn't request frames, so the display can
   * drop its refresh rate and the main thread can sleep.
   */
  let nativeFrameRequested = false;

  function requestNativeFrame() {
    if (!nativeFrameRequested) {
      nativeFrameRequested = true;
      globalThis.__nativeRequestAnimationFrame(nativeFlushQueue);
    }
  }

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
  }

  function requestAnimationFrame(
    callback: (timestamp: number) => void
  ): number {
    const handle = queuedCallbacksEnd++;
    queuedCallbacks.push(callback);
    requestNativeFrame();
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
    // Work queued while the frame is flushed requests the next frame.
    nativeFrameRequested = false;
    flushQueue(timestamp);
  }

  function flushQueue(timestamp: number) {
    globalThis.__frameTimestamp = timestamp;
    executeQueue(timestamp);
    globalThis.__frameTimestamp = undefined;
  }

  globalThis.requestAnimationFrame = requestAnimationFrame;
  globalThis.cancelAnimationFrame =
    cancelAnimationFrame as typeof globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrameFinalizer = (callback: () => void) => {
    queuedFinalizers.push(callback);
    requestNativeFrame();
  };

  /*
   * A microtask queued outside of a task that drains microtasks (for example
   * from a native callback) is drained by the next frame, so request one.
   */
  const enqueueMicrotask = globalThis.queueMicrotask;
  globalThis.queueMicrotask = (callback: () => void) => {
    enqueueMicrotask(callback);
    requestNativeFrame();
  };

  /* Run the first frame */
  requestNativeFrame();

  // TODO: Remove it after support for Reanimated 4.3 is dropped.
  globalThis.__flushAnimationFrame = (eventTimestamp: number) => {
    flushQueue(eventTimestamp);
  };
}
