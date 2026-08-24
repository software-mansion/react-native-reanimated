'use strict';

import { IS_JEST } from './platformChecker';

export function scheduleOnUI<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void {
  enqueueUI(worklet, args);
}

export function runOnUI<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): (...args: Args) => void {
  return (...args) => {
    scheduleOnUI(worklet, ...args);
  };
}

export function runOnUISync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;

export function runOnUISync(): never {
  throw new Error('[Worklets] `runOnUISync` is not supported on web.');
}

export function executeOnUIRuntimeSync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): (...args: Args) => ReturnValue;

export function executeOnUIRuntimeSync(): never {
  throw new Error(
    '[Worklets] `executeOnUIRuntimeSync` is not supported on web.'
  );
}

export function runOnJS<Args extends unknown[], ReturnValue>(
  fun: (...args: Args) => ReturnValue
): (...args: Args) => void {
  return (...args) => scheduleOnRN(fun, ...args);
}

export function scheduleOnRN<Args extends unknown[], ReturnValue>(
  fun: (...args: Args) => ReturnValue,
  ...args: Args
): void {
  queueMicrotask(
    args.length
      ? () => (fun as (...args: Args) => ReturnValue)(...args)
      : (fun as () => ReturnValue)
  );
}

export function runOnUIAsync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): Promise<ReturnValue> {
  return new Promise<ReturnValue>((resolve, reject) => {
    enqueueUI(worklet, args, resolve, reject);
  });
}

type UIJob<Args extends unknown[] = unknown[], ReturnValue = unknown> = [
  worklet: (...args: Args) => ReturnValue,
  args: Args,
  resolve?: (value: ReturnValue) => void,
  reject?: (reason?: unknown) => void,
];

let runOnUIQueue: UIJob[] = [];

function enqueueUI<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  args: Args,
  resolve?: (value: ReturnValue) => void,
  reject?: (reason?: unknown) => void
): void {
  const job = [worklet, args, resolve, reject];
  runOnUIQueue.push(job as UIJob);
  if (runOnUIQueue.length === 1) {
    if (IS_JEST) {
      flushUIQueue();
    } else {
      queueMicrotask(flushUIQueue);
    }
  }
}

let offset = 0;

function flushUIQueue(): void {
  const queue = runOnUIQueue;
  runOnUIQueue = [];
  requestAnimationFrame(() => {
    offset = 0;
    while (queue.length > offset) {
      try {
        drainUIQueue(queue);
      } catch (e) {
        const [, , , jobReject] = queue[offset - 1];
        if (jobReject) {
          jobReject(e);
        } else {
          console.error(e);
        }
      }
    }
  });
}

function drainUIQueue(queue: UIJob[]): void {
  while (queue.length > offset) {
    const [workletFunction, workletArgs, jobResolve] = queue[offset];
    offset++;
    const result = workletFunction(...workletArgs);
    if (jobResolve) {
      jobResolve(result);
    }
  }
}
