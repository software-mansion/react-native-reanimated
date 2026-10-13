'use strict';

import { setupQueueMicrotask } from '../common/queueMicrotaskPolyfill';
import { setupSetImmediate } from '../common/setImmediatePolyfill';
import { setupSetInterval } from '../common/setIntervalPolyfill';
import { setupRequestAnimationFrame } from './requestAnimationFramePolyfill';
import { setupSetTimeout } from './setTimeout';
import { setupTaskQueue } from './taskQueue';

export function setupRunLoop(animationQueuePollingRate: number) {
  'worklet';
  setupTaskQueue();
  setupQueueMicrotask();
  setupSetTimeout();
  setupRequestAnimationFrame(animationQueuePollingRate);
  setupSetImmediate();
  setupSetInterval();
}
