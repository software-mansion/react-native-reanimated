'use strict';

export function setupTaskQueue() {
  'worklet';

  const queue = {
    microtasks: [],
    timeoutCallbacks: new Map()
  };
  globalThis._taskQueue = queue;
  globalThis.__runTimeoutCallback = function (handlerId) {
    const task = queue.timeoutCallbacks.get(handlerId);
    task?.();
    queue.timeoutCallbacks.delete(handlerId);
    globalThis.__flushMicrotasks();
  };
  globalThis.__flushMicrotasks = function () {
    for (let i = 0; i < queue.microtasks.length; i++) {
      queue.microtasks[i]();
    }
    queue.microtasks = [];
  };
}
export function pushMicrotask(callback) {
  'worklet';

  const queue = globalThis._taskQueue;
  queue.microtasks.push(callback);
}
export function pushTask(callback, handlerId, delay) {
  'worklet';

  const queue = globalThis._taskQueue;
  queue.timeoutCallbacks.set(handlerId, callback);
  globalThis._scheduleTimeoutCallback(delay, handlerId);
}
//# sourceMappingURL=taskQueue.js.map