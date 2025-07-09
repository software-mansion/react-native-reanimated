'use strict';

export function setupSetTimeout() {
  'worklet';

  const setTimeoutPolyfill = (
    callback: (...args: unknown[]) => void,
    delay: number,
    ...args: unknown[]
  ) => {
    const time = performance.now();
    return globalThis.requestAnimationFrame(() => {
      const now = performance.now();
      if (performance.now() - time >= delay) {
        callback(...args);
      } else {
        const newDelay = delay - (now - time);
        globalThis.requestAnimationFrame(() => {
          setTimeoutPolyfill(callback, newDelay, ...args);
        });
      }
    });
  };

  const clearTimeoutPolyfill = (id: number) => {
    globalThis.cancelAnimationFrame(id);
  };

  // @ts-expect-error TODO:
  globalThis.setTimeout = setTimeoutPolyfill;
  // @ts-expect-error TODO:
  globalThis.clearTimeout = clearTimeoutPolyfill;
}
