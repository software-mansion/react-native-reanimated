'use strict';

import { WorkletsError } from './debug/WorkletsError';
import { IS_JEST } from './platformChecker';
import { mockedRequestAnimationFrame } from './runLoop/uiRuntime/mockedRequestAnimationFrame';

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
  throw new WorkletsError('`runOnUISync` is not supported on web.');
}

export function executeOnUIRuntimeSync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): (...args: Args) => ReturnValue;

export function executeOnUIRuntimeSync(): never {
  throw new WorkletsError('`executeOnUIRuntimeSync` is not supported on web.');
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
  return new Promise<ReturnValue>((resolve) => {
    enqueueUI(worklet, args, resolve);
  });
}

type UIJob<Args extends unknown[] = unknown[], ReturnValue = unknown> = [
  worklet: (...args: Args) => ReturnValue,
  args: Args,
  resolve?: (value: ReturnValue) => void,
];

let runOnUIQueue: UIJob[] = [];

function enqueueUI<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  args: Args,
  resolve?: (value: ReturnValue) => void
): void {
  if (IS_JEST) {
    mockedRequestAnimationFrame(() => {
      const result = worklet(...args);
      resolve?.(result);
    });
  } else {
    const job = [worklet, args, resolve];
    runOnUIQueue.push(job as UIJob);
    if (runOnUIQueue.length === 1) {
      flushUIQueue();
    }
  }
}

function flushUIQueue(): void {
  queueMicrotask(() => {
    const queue = runOnUIQueue;
    runOnUIQueue = [];
    requestAnimationFrameImpl(() => {
      queue.forEach(([workletFunction, workletArgs, jobResolve]) => {
        const result = workletFunction(...workletArgs);
        if (jobResolve) {
          jobResolve(result);
        }
      });
    });
  });
}

const requestAnimationFrameImpl = !globalThis.requestAnimationFrame
  ? mockedRequestAnimationFrame
  : globalThis.requestAnimationFrame;
