'use strict';

export function setupSetInterval() {
  'worklet';

  const intervalHandleToTimeoutHandle: Map<number, number> = new Map();

  const setIntervalPolyfill = (
    callback: (...args: unknown[]) => void,
    delay: number,
    ...args: unknown[]
  ) => {
    const timeoutHandle = setTimeout(() => {
      callback(...args);
      const newTimeoutHandle = setTimeout(
        callback,
        delay,
        ...args
      ) as unknown as number;
      intervalHandleToTimeoutHandle.set(timeoutHandle, newTimeoutHandle);
    }, delay) as unknown as number;

    return timeoutHandle;
  };

  const clearIntervalPolyfill = (id: number) => {
    const timeoutHandle = intervalHandleToTimeoutHandle.get(id);
    intervalHandleToTimeoutHandle.delete(id);
    clearTimeout(timeoutHandle);
  };

  // @ts-expect-error TODO:
  globalThis.setInterval = setIntervalPolyfill;
  // @ts-expect-error TODO:
  globalThis.clearInterval = clearIntervalPolyfill;
}
