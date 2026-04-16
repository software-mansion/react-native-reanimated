'use strict';

export function setupSetInterval() {
  'worklet';

  const intervalHandleToTimeoutHandle: Map<number, number> = new Map();

  const setIntervalPolyfill = (
    callback: (...args: unknown[]) => void,
    delay: number = 0,
    ...args: unknown[]
  ) => {
    let intervalHandle = 0;

    const repeatingCallback = () => {
      const timeoutHandle = setTimeout(
        repeatingCallback,
        delay
      ) as unknown as number;
      intervalHandleToTimeoutHandle.set(intervalHandle, timeoutHandle);
      callback(...args);
    };

    intervalHandle = setTimeout(repeatingCallback, delay) as unknown as number;
    intervalHandleToTimeoutHandle.set(intervalHandle, intervalHandle);

    return intervalHandle;
  };

  const clearIntervalPolyfill = (intervalHandle: number) => {
    const timeoutHandle = intervalHandleToTimeoutHandle.get(intervalHandle);
    clearTimeout(timeoutHandle);
    intervalHandleToTimeoutHandle.delete(intervalHandle);
  };

  globalThis.setInterval = setIntervalPolyfill as typeof setInterval;
  globalThis.clearInterval = clearIntervalPolyfill as typeof clearInterval;
}
