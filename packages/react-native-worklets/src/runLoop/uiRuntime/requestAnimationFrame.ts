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

    const errors: unknown[] = [];
    if (flushedCallbacks.length > 0) {
      for (const callback of flushedCallbacks) {
        try {
          callback(timestamp);
        } catch (error) {
          errors.push(error);
        }
        drainMicrotasks(errors);
      }
    } else {
      drainMicrotasks(errors);
    }
    flushedCallbacksBegin = flushedCallbacksEnd;
    flushedCallbacks = [];

    const finalizers = queuedFinalizers;
    queuedFinalizers = [];
    let finalizerIndex = 0;
    try {
      for (; finalizerIndex < finalizers.length; finalizerIndex++) {
        finalizers[finalizerIndex]();
      }
    } catch (error) {
      errors.push(error);
    } finally {
      if (finalizerIndex < finalizers.length) {
        queuedFinalizers = finalizers
          .slice(finalizerIndex + 1)
          .concat(queuedFinalizers);
      }
    }
    drainMicrotasks(errors);

    throwErrors(errors);
  }

  function drainMicrotasks(errors: unknown[]) {
    for (;;) {
      try {
        globalThis.__drainMicrotasks();
        return;
      } catch (error) {
        errors.push(error);
      }
    }
  }

  function throwErrors(errors: unknown[]) {
    if (errors.length === 0) {
      return;
    }
    for (let i = 1; i < errors.length; i++) {
      reportError(errors[i]);
    }
    throw errors[0];
  }

  function reportError(error: unknown) {
    if (error instanceof Error) {
      globalThis.__workletsModuleProxy.reportFatalErrorOnJS(
        error.message,
        error.stack ?? '',
        error.name
      );
    } else {
      globalThis.__workletsModuleProxy.reportFatalErrorOnJS(
        describeThrownValue(error),
        '',
        'Error'
      );
    }
  }

  function describeThrownValue(value: unknown): string {
    try {
      return String(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
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
