'use strict';

export function setupRequestAnimationFrame() {
  'worklet';
  const callMicrotasks = globalThis.__callMicrotasks;

  let queuedCallbacks: ((timestamp: number) => void)[] = [];
  let queuedCallbacksBegin = 0;
  let queuedCallbacksEnd = 0;

  let flushedCallbacks = queuedCallbacks;
  let flushedCallbacksBegin = 0;
  let flushedCallbacksEnd = 0;

  let queuedFinalizers: (() => void)[] = [];

  // Whether the per-frame flush loop is currently scheduled. The loop stops itself when there is no
  // queued work and is restarted by `scheduleFlush()` whenever something is enqueued, so an idle UI
  // runtime no longer runs the loop on every frame.
  let isLoopScheduled = false;

  function scheduleFlush() {
    if (!isLoopScheduled) {
      isLoopScheduled = true;
      globalThis.__nativeRequestAnimationFrame(nativeFlushQueue);
    }
  }

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
    scheduleFlush();
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

    /* Schedule the next frame only while there is pending work; otherwise stop the loop and let
       scheduleFlush() restart it on the next enqueue. */
    if (queuedCallbacks.length > 0 || queuedFinalizers.length > 0) {
      globalThis.__nativeRequestAnimationFrame(nativeFlushQueue);
    } else {
      isLoopScheduled = false;
    }
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
    scheduleFlush();
  };

  /* Start the loop */
  scheduleFlush();

  // TODO: Remove it after support for Reanimated 4.3 is dropped.
  globalThis.__flushAnimationFrame = (eventTimestamp: number) => {
    flushQueue(eventTimestamp);
  };
}
