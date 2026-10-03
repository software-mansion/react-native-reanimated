'use strict';

import { selectFrameTimestamp } from './frameTimestamp';

export function setupRequestAnimationFrame() {
  'worklet';

  let queuedCallbacks: ((timestamp: number) => void)[] = [];
  let queuedCallbacksBegin = 0;
  let queuedCallbacksEnd = 0;

  let flushedCallbacks = queuedCallbacks;
  let flushedCallbacksBegin = 0;
  let flushedCallbacksEnd = 0;

  let queuedFinalizers: (() => void)[] = [];

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
    globalThis.__nativeRequestAnimationFrame(nativeFlushQueue);
  }

  // Set only while a flush owns the timestamp. When it is unset, the getter
  // below reads the platform frame in progress, and between frames it is
  // undefined. Writing a live reading back into this override would pin that
  // frame's timestamp after the frame has ended.
  let frameTimestampOverride: number | undefined;

  function readCurrentFrameTimestamp(): number | undefined {
    const read = globalThis.__getCurrentFrameTimestamp;
    if (typeof read !== 'function') {
      return undefined;
    }
    const timestamp = read();
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
      return undefined;
    }
    return timestamp;
  }

  Object.defineProperty(globalThis, '__frameTimestamp', {
    configurable: true,
    enumerable: false,
    get() {
      return selectFrameTimestamp(
        frameTimestampOverride,
        frameTimestampOverride === undefined
          ? readCurrentFrameTimestamp()
          : undefined
      );
    },
    set(value: number | undefined) {
      frameTimestampOverride =
        typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    },
  });

  function flushQueue(timestamp: number) {
    globalThis.__frameTimestamp = timestamp;
    try {
      executeQueue(timestamp);
    } finally {
      globalThis.__frameTimestamp = undefined;
    }
  }

  globalThis.requestAnimationFrame = requestAnimationFrame;
  globalThis.cancelAnimationFrame =
    cancelAnimationFrame as typeof globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrameFinalizer = (callback: () => void) => {
    queuedFinalizers.push(callback);
  };

  /* Start the loop */
  globalThis.__nativeRequestAnimationFrame(nativeFlushQueue);

  // TODO: Remove it after support for Reanimated 4.3 is dropped.
  globalThis.__flushAnimationFrame = (eventTimestamp: number) => {
    flushQueue(eventTimestamp);
  };
}
