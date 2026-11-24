'use strict';

type Callback = () => void;

export type Queue = {
  timeoutCallbacks: Map<number, Callback>;
};

export function setupTaskQueue() {
  'worklet';
  const queue: Queue = {
    timeoutCallbacks: new Map(),
  };
  globalThis._taskQueue = queue;

  globalThis.__runTimeoutCallback = function (handlerId: number) {
    const task = queue.timeoutCallbacks.get(handlerId);
    task?.();
    queue.timeoutCallbacks.delete(handlerId);
  };
}

export function pushTask(callback: Callback, handlerId: number, delay: number) {
  'worklet';
  const queue = globalThis._taskQueue;
  queue.timeoutCallbacks.set(handlerId, callback);
  globalThis._scheduleTimeoutCallback(delay, handlerId);
}
