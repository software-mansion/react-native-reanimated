'use strict';

import { setupSetImmediate } from '../common/setImmediatePolyfill';
import { setupSetInterval } from '../common/setIntervalPolyfill';
import { setupQueueMicrotask } from './queueMicrotaskPolyfill';
import { setupRequestAnimationFrame } from './requestAnimationFramePolyfill';
import { setupSetTimeout } from './setTimeoutPolyfill';
import { setupTaskQueue } from './taskQueue';

export function setupRunLoop(animationQueuePollingRate?: number) {
  'worklet';
  setupTaskQueue();
  setupQueueMicrotask();
  setupSetTimeout();
  setupRequestAnimationFrame(animationQueuePollingRate);
  setupSetImmediate();
  setupSetInterval();
}
