import { Queue } from "./types";

export function setupSetImmediate(queue: Queue) {
  'worklet'

  function requestPriorityEventLoopTick() {
    if (queue.isMicroTasksProcessing) {
      return;
    }
    queue.isMicroTasksProcessing = true;
    globalThis.__requestEventLoopTick(true);
  }

  globalThis.setImmediate = function (
    callback: (...args: unknown[]) => void,
    ...args: unknown[]
  ) {
    queue.priority.push(() => callback(...args));
    requestPriorityEventLoopTick();
  } as typeof setImmediate;

  globalThis.queueMicrotask = globalThis.setImmediate as typeof queueMicrotask;
}
