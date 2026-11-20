'use strict';

/**
 * Remote error is an error coming from a Worklet Runtime that we bubble up to
 * the RN Runtime.
 */
export function reportFatalRemoteError(
  { message, stack, name }: Error,
  force: boolean
): void {
  const error = new Error('[Worklets]');
  error.message = message;
  error.stack = stack;
  error.name = name;
  if (force) {
    throw error;
  } else {
    // @ts-expect-error React Native's `ErrorUtils` are hidden from the global scope.
    globalThis.ErrorUtils.reportFatalError(error);
  }
}

/**
 * Registers `reportFatalRemoteError` function in global scope to allow to
 * invoke it from C++.
 */
export function registerReportFatalRemoteError() {
  globalThis.__reportFatalRemoteError = reportFatalRemoteError;
}
