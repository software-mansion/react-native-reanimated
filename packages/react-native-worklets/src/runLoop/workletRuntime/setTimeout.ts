'use strict';

import { pushTask } from './taskQueue';

export function setupSetTimeout() {
  'worklet';

  const pendingHandlers: Set<number> = new Set();
  let ID = 0;

  const setTimeoutPolyfill = (
    callback: (...args: unknown[]) => void,
    delay: number = 0,
    ...args: unknown[]
  ) => {
    const handlerId = ID++;

    const timeoutCallback = () => {
      if (!pendingHandlers.has(handlerId)) {
        return;
      }
      pendingHandlers.delete(handlerId);
      callback(...args);
    };

    pendingHandlers.add(handlerId);
    pushTask(timeoutCallback, handlerId, delay);
    return handlerId;
  };

  const clearTimeoutPolyfill = (timeoutHandle: number) => {
    pendingHandlers.delete(timeoutHandle);
  };

  globalThis.setTimeout = setTimeoutPolyfill as typeof setTimeout;
  globalThis.clearTimeout = clearTimeoutPolyfill as typeof clearTimeout;
}
