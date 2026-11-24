'use strict';

import { pushImmediateTask, pushTask } from './taskQueue';

export function setupSetTimeout() {
  'worklet';

  const pendingHandlers: Set<number> = new Set();
  let ID = 0;

  const schedule = (
    callback: (...args: unknown[]) => void,
    args: unknown[],
    push: (task: () => void, handlerId: number) => void
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
    push(timeoutCallback, handlerId);
    return handlerId;
  };

  const setTimeoutPolyfill = (
    callback: (...args: unknown[]) => void,
    delay: number = 0,
    ...args: unknown[]
  ) =>
    schedule(callback, args, (task, handlerId) =>
      pushTask(task, handlerId, delay)
    );

  const scheduleImmediate = (
    callback: (...args: unknown[]) => void,
    ...args: unknown[]
  ) => schedule(callback, args, pushImmediateTask);

  const clearTimeoutPolyfill = (timeoutHandle: number) => {
    pendingHandlers.delete(timeoutHandle);
  };

  globalThis.setTimeout = setTimeoutPolyfill as typeof setTimeout;
  globalThis.clearTimeout = clearTimeoutPolyfill as typeof clearTimeout;
  globalThis.__scheduleImmediate = scheduleImmediate;
}
