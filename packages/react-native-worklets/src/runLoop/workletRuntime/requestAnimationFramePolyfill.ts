'use strict';

export function setupRequestAnimationFrame(
  animationQueuePollingRate: number,
  enableVSync: boolean
) {
  'worklet';
  const timeoutInterval = animationQueuePollingRate;
  const scheduleVSyncCallback = globalThis.__scheduleVSyncCallback;
  if (enableVSync && !scheduleVSyncCallback) {
    throw new Error(
      '[Worklets] The v-sync frame source is not available on this Worklet Runtime.'
    );
  }
  const requestFlush =
    enableVSync && scheduleVSyncCallback
      ? scheduleVSyncCallback
      : () => {
          setTimeout(flushAnimationFrameOnTimeout, timeoutInterval);
        };

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
    globalThis.__runVSyncCallback = flushAnimationFrame;
  }

  globalThis.requestAnimationFrame = (
    callback: (timestamp: number) => void
  ): number => {
    const handle = queuedCallbacksEnd++;

    queuedCallbacks.push(callback);
    if (!flushRequested) {
      flushRequested = true;

      requestFlush();
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
