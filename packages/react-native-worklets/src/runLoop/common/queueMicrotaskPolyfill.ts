'use strict';

// See https://github.com/facebook/hermes/blob/829dcd74f5b774d19a86ab1dc47e3dee9e44d190/lib/VM/JSLib/HermesInternal.cpp#L421-L432.
type IHermesInternal = typeof HermesInternal & {
  enqueueJob: (job: () => void) => void;
};
export function setupQueueMicrotask() {
  'worklet';
  globalThis.queueMicrotask = (
    (globalThis as Record<string, unknown>).HermesInternal as IHermesInternal
  ).enqueueJob;
}
