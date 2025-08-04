'use strict';

import { pushMicrotask } from './taskQueue';

export function setupQueueMicrotask() {
  'worklet';
  globalThis.queueMicrotask = function (
    callback: (...args: unknown[]) => void,
    ...args: unknown[]
  ) {
    pushMicrotask(() => callback(...args));
  } as typeof queueMicrotask;
}
