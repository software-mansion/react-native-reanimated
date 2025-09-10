'use strict';

export function setupSetTimeout() {
  'worklet';

  const timeoutHandleToRafHandle = new Map();
  const setTimeoutPolyfill = (callback, delay = 0, ...args) => {
    const start = performance.now();
    let timeoutHandle = 0;
    const rafCallback = () => {
      const now = performance.now();
      if (now - start >= delay) {
        callback(...args);
        timeoutHandleToRafHandle.delete(timeoutHandle);
      } else {
        const rafHandle = requestAnimationFrame(rafCallback);
        timeoutHandleToRafHandle.set(timeoutHandle, rafHandle);
      }
    };
    timeoutHandle = requestAnimationFrame(rafCallback);
    timeoutHandleToRafHandle.set(timeoutHandle, timeoutHandle);
    return timeoutHandle;
  };
  const clearTimeoutPolyfill = timeoutHandle => {
    const rafHandle = timeoutHandleToRafHandle.get(timeoutHandle);
    timeoutHandleToRafHandle.delete(timeoutHandle);
    cancelAnimationFrame(rafHandle);
  };
  globalThis.setTimeout = setTimeoutPolyfill;
  globalThis.clearTimeout = clearTimeoutPolyfill;
}
//# sourceMappingURL=setTimeoutPolyfill.js.map