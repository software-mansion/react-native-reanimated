'use strict';

import { pushTask } from './taskQueue';

export function setupSetTimeout(enableVSync: boolean) {
  'worklet';

  const pendingHandlers: Set<number> = new Set();
  let ID = 0;

  const schedule = (
    callback: (...args: unknown[]) => void,
    delay: number,
    args: unknown[],
    frameAligned: boolean
  ) => {
    const handlerId = ID++;

    const timeoutCallback = () => {
      if (!pendingHandlers.has(handlerId)) {
        return;
      }
      callback(...args);
      pendingHandlers.delete(handlerId);
    };

    pendingHandlers.add(handlerId);
    pushTask(timeoutCallback, handlerId, delay, frameAligned);
    return handlerId;
  };

  const setTimeoutPolyfill = (
    callback: (...args: unknown[]) => void,
    delay: number = 0,
    ...args: unknown[]
  ) => schedule(callback, delay, args, enableVSync);

  const clearTimeoutPolyfill = (timeoutHandle: number) => {
    pendingHandlers.delete(timeoutHandle);
  };

  globalThis.setTimeout = setTimeoutPolyfill as typeof setTimeout;
  globalThis.clearTimeout = clearTimeoutPolyfill as typeof clearTimeout;
}
