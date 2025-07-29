import { setupSetInterval } from "../runLoop/setIntervalPolyfill";
import { setupRequestAnimationFrame } from "./requestAnimationFramePolyfill";
import { setupSetImmediate } from "./setImmediatePolyfill";
import { setupSetTimeout } from "./setTimeoutPolyfill";
import { Queue } from "./types";

export function initializeEventLoop() {
  'worklet';
  const queue: Queue = {
    normal: [],
    priority: [],
    isMicroTasksProcessing: false,
  };

  globalThis.__drainTasks = function () {

    while (queue.priority.length > 0) {
      const priorityTask = queue.priority.shift();
      if (priorityTask) {
        priorityTask();
      }
    }
    queue.isMicroTasksProcessing = false;
    
    const task = queue.normal.shift();
    task?.();
  }

  setupSetImmediate(queue);
  setupSetTimeout(queue);
  setupSetInterval();
  setupRequestAnimationFrame();
}
