'use strict';

import { mockedRequestAnimationFrame } from './runLoop/uiRuntime/mockedRequestAnimationFrame';

export function scheduleOnUI<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void {
  requestAnimationFrame(() => worklet(...args));
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
  return new Promise<ReturnValue>((resolve) => {
    requestAnimationFrame(() => {
      const result = worklet(...args);
      resolve?.(result);
    });
  });
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame =
    mockedRequestAnimationFrame as unknown as typeof requestAnimationFrame;
}
