'use strict';

export function setupSetInterval() {
  'worklet';

  const intervalHandleToTimeoutHandle = new Map();
  const setIntervalPolyfill = (callback, delay = 0, ...args) => {
    let intervalHandle = 0;
    const repeatingCallback = () => {
      const timeoutHandle = setTimeout(repeatingCallback, delay);
      intervalHandleToTimeoutHandle.set(intervalHandle, timeoutHandle);
      callback(...args);
    };
    intervalHandle = setTimeout(repeatingCallback, delay);
    intervalHandleToTimeoutHandle.set(intervalHandle, intervalHandle);
    return intervalHandle;
  };
  const clearIntervalPolyfill = intervalHandle => {
    const timeoutHandle = intervalHandleToTimeoutHandle.get(intervalHandle);
    clearTimeout(timeoutHandle);
    intervalHandleToTimeoutHandle.delete(intervalHandle);
  };
  globalThis.setInterval = setIntervalPolyfill;
  globalThis.clearInterval = clearIntervalPolyfill;
}
//# sourceMappingURL=setIntervalPolyfill.js.map