'use strict';

import type { WorkletFunction } from './workletTypes';

/**
 * This function allows you to determine if a given function is a worklet. It
 * only works with Reanimated Babel plugin enabled. Unless you are doing
 * something with internals of Reanimated you shouldn't need to use this
 * function.
 *
 * ### Note
 *
 * Do not call it before the worklet is declared, as it will always return false
 * then. E.g.:
 *
 * ```ts
 * isWorkletFunction(myWorklet); // Will always return false.
 *
 * function myWorklet() {
 *   'worklet';
 * }
 * ```
 *
 * ### Maintainer note
 *
 * This function is supposed to be used only in the React Runtime. It always
 * returns `false` in Worklet Runtimes.
 */
export function isWorkletFunction<
  Args extends unknown[] = unknown[],
  ReturnValue = unknown,
>(value: unknown): value is WorkletFunction<Args, ReturnValue> {
  'worklet';
  // Since host objects always return true for `in` operator, we have to use dot notation to check if the property exists.
  // See https://github.com/facebook/hermes/blob/340726ef8cf666a7cce75bc60b02fa56b3e54560/lib/VM/JSObject.cpp#L1276.

  return (
    // `__workletHash` isn't extracted in Worklet Runtimes.
    typeof value === 'function' &&
    !!(value as unknown as Record<string, unknown>).__workletHash
  );
}
