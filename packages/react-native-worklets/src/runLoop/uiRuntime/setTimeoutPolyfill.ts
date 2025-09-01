'use strict';

export function setupSetTimeout() {
  'worklet';

  const timeoutHandleToRafHandle: Map<number, number> = new Map();

  const setTimeoutPolyfill = (
    callback: (...args: unknown[]) => void,
    delay: number = 0,
    ...args: unknown[]
  ) => {
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

  const clearTimeoutPolyfill = (timeoutHandle: number) => {
    const rafHandle = timeoutHandleToRafHandle.get(timeoutHandle);
    timeoutHandleToRafHandle.delete(timeoutHandle);
    cancelAnimationFrame(rafHandle!);
  };

  globalThis.setTimeout = setTimeoutPolyfill as typeof setTimeout;
  globalThis.clearTimeout = clearTimeoutPolyfill as typeof clearTimeout;
}
