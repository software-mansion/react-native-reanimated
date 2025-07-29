'use strict';

import { Queue } from "./types";

export function setupSetTimeout(queue: Queue) {
  'worklet';

  const pendingHandlers: Set<number> = new Set();
  let ID = 0;

  const setTimeoutPolyfill = (
    callback: (...args: unknown[]) => void,
    delay: number = 1,
    ...args: unknown[]
  ) => {
    const handlerId = ID++;
    const start = performance.now();

    const timeoutCallback = () => {
      if (!pendingHandlers.has(handlerId)) {
        return;
      }
      const now = performance.now();
      if (now - start >= delay) {
        callback(...args);
        pendingHandlers.delete(handlerId);
      } else {
        queue.normal.push(timeoutCallback);
        global.__requestEventLoopTick();
      }
    };

    queue.normal.push(timeoutCallback);
    pendingHandlers.add(handlerId);
    global.__requestEventLoopTick();
    return handlerId;
  };

  const clearTimeoutPolyfill = (timeoutHandle: number) => {
    pendingHandlers.delete(timeoutHandle);
  };

  globalThis.setTimeout = setTimeoutPolyfill as typeof setTimeout;
  globalThis.clearTimeout = clearTimeoutPolyfill as typeof clearTimeout;
}
