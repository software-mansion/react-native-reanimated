'use strict';

type Callback = () => void;

export type Queue = {
  microtasks: Array<Callback>;
  timeoutCallbacks: Map<number, Callback>;
};

export function setupTaskQueue() {
  'worklet';
  const queue: Queue = {
    microtasks: [],
    timeoutCallbacks: new Map(),
  };
  globalThis._taskQueue = queue;

  globalThis.__runTimeoutCallback = function (handlerId: number) {
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

export function pushMicrotask(callback: Callback) {
  'worklet';
  const queue = globalThis._taskQueue;
  queue.microtasks.push(callback);
}

export function pushTask(callback: Callback, handlerId: number, delay: number) {
  'worklet';
  const queue = globalThis._taskQueue;
  queue.timeoutCallbacks.set(handlerId, callback);
  globalThis._scheduleTimeoutCallback(delay, handlerId);
}
