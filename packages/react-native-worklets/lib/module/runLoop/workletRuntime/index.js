'use strict';

import { setupSetImmediate } from "../common/setImmediatePolyfill.js";
import { setupSetInterval } from "../common/setIntervalPolyfill.js";
import { setupQueueMicrotask } from "./queueMicrotask.js";
import { setupRequestAnimationFrame } from "./requestAnimationFramePolyfill.js";
import { setupSetTimeout } from "./setTimeout.js";
import { setupTaskQueue } from "./taskQueue.js";
export function setupRunLoop(animationQueuePollingRate) {
  'worklet';

  setupTaskQueue();
  setupQueueMicrotask();
  setupSetTimeout();
  setupRequestAnimationFrame(animationQueuePollingRate);
  setupSetImmediate();
  setupSetInterval();
}
//# sourceMappingURL=index.js.map