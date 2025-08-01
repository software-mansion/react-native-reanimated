'use strict';

type Callback = () => void;

export type Queue = {
  priority: Array<Callback>;
  isMicroTasksProcessing: boolean;
  normal: Map<number, Callback>;
};

enum TaskType {
  PRIORITY = 0,
  TIMEOUT = 1,
}

export function setupTaskQueue() {
  'worklet';
  const queue: Queue = {
    priority: [],
    isMicroTasksProcessing: false,
    normal: new Map(),
  };
  globalThis._taskQueue = queue;

  globalThis.__runQueuedTask = function (handlerId?: number) {
    while (queue.priority.length > 0) {
      const priorityTask = queue.priority.shift();
      if (priorityTask) {
        priorityTask();
      }
    }
    queue.isMicroTasksProcessing = false;

    if (handlerId !== undefined) {
      const task = queue.normal.get(handlerId);
      task?.();
      queue.normal.delete(handlerId);
    }
  };
}

export function pushMicrotask(callback: Callback) {
  'worklet';
  const queue = globalThis._taskQueue;
  queue.priority.push(callback);
  if (queue.isMicroTasksProcessing) {
    return;
  }
  queue.isMicroTasksProcessing = true;
  globalThis._requestEventLoopTick(TaskType.PRIORITY, 0, 0);
}

export function pushTask(callback: Callback, handlerId: number, delay: number) {
  'worklet';
  const queue = globalThis._taskQueue;
  queue.normal.set(handlerId, callback);
  global._requestEventLoopTick(TaskType.TIMEOUT, delay, handlerId);
}
