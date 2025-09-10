'use strict';

export function setupRequestAnimationFrame(animationQueuePollingRate) {
  'worklet';

  const timeoutInterval = animationQueuePollingRate;
  let queuedCallbacks = [];
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
    for (const callback of flushedCallbacks) {
      callback(timestamp);
      globalThis.__flushMicrotasks();
    }
    flushedCallbacksBegin = flushedCallbacksEnd;
  }
  globalThis.requestAnimationFrame = callback => {
    const handle = queuedCallbacksEnd++;
    queuedCallbacks.push(callback);
    if (!flushRequested) {
      flushRequested = true;
      setTimeout(flushAnimationFrame, timeoutInterval);
    }
    return handle;
  };
  globalThis.cancelAnimationFrame = handle => {
    if (handle < flushedCallbacksBegin || handle >= queuedCallbacksEnd) {
      return;
    }
    if (handle < flushedCallbacksEnd) {
      flushedCallbacks[handle - flushedCallbacksBegin] = () => {};
    } else {
      queuedCallbacks[handle - queuedCallbacksBegin] = () => {};
    }
  };
}
//# sourceMappingURL=requestAnimationFramePolyfill.js.map