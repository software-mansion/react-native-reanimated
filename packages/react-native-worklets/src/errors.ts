'use strict';

import type { WorkletStackDetails } from './workletTypes';

export type CustomError<TName extends string> = Error & { name: TName }; // signed type

export interface CustomErrorConstructor<TName extends string> extends Error {
  new (message?: string): CustomError<TName>;
  (message?: string): CustomError<TName>;
  readonly prototype: CustomError<TName>;
}

export function createCustomError<TName extends string>(
  name: TName
): CustomErrorConstructor<TName> {
  const constructor = function CustomError(message?: string) {
    'worklet';
    const prefix = `[${name}]`;
    // eslint-disable-next-line reanimated/use-worklets-error
    const errorInstance = new Error(message ? `${prefix} ${message}` : prefix);
    errorInstance.name = `${name}Error`;
    return errorInstance;
  };

  Object.defineProperty(constructor, 'name', { value: `${name}Error` });

  return constructor as CustomErrorConstructor<TName>;
}

/** Registers custom errors in global scope. Use it only for Worklet runtimes. */
export function registerCustomError<TName extends string>(
  constructor: CustomErrorConstructor<TName>,
  name: TName
) {
  'worklet';
  if (!_WORKLET) {
    // eslint-disable-next-line reanimated/use-worklets-error
    throw new Error(
      '[Worklets] registerCustomError() must be called on a Worklet runtime'
    );
  }
  (global as Record<string, unknown>)[`${name}Error`] = constructor;
}

const _workletStackDetails = new Map<number, WorkletStackDetails>();

export function registerWorkletStackDetails(
  hash: string,
  stackDetails: WorkletStackDetails
) {
  _workletStackDetails.set(Number(hash), stackDetails);
}

function getBundleOffset(error: Error): [string, number, number] {
  const frame = error.stack?.split('\n')?.[0];
  if (frame) {
    const parsedFrame = /@([^@]+):(\d+):(\d+)/.exec(frame);
    if (parsedFrame) {
      const [, file, line, col] = parsedFrame;
      return [file, Number(line), Number(col)];
    }
  }
  return ['unknown', 0, 0];
}

function processStack(stack: string): string {
  const workletStackEntries = stack.match(/worklet_(\d+):(\d+):(\d+)/g);
  let result = stack;
  workletStackEntries?.forEach((match) => {
    const [, hash, origLine, origCol] = match.split(/:|_/).map(Number);
    const errorDetails = _workletStackDetails.get(hash);
    if (!errorDetails) {
      return;
    }
    const [error, lineOffset, colOffset] = errorDetails;
    const [bundleFile, bundleLine, bundleCol] = getBundleOffset(error);
    const line = origLine + bundleLine + lineOffset;
    const col = origCol + bundleCol + colOffset;

    result = result.replace(match, `${bundleFile}:${line}:${col}`);
  });
  return result;
}

export function reportFatalErrorOnJS({
  message,
  stack,
  moduleName,
}: {
  message: string;
  stack?: string;
  moduleName: string;
}) {
  // eslint-disable-next-line reanimated/use-worklets-error
  const error = new Error();
  error.message = message;
  error.stack = stack ? processStack(stack) : undefined;
  error.name = `${moduleName}Error`;
  // @ts-ignore React Native's ErrorUtils implementation extends the Error type with jsEngine field
  error.jsEngine = moduleName;
  // @ts-ignore the reportFatalError method is an internal method of ErrorUtils not exposed in the type definitions
  global.ErrorUtils.reportFatalError(error);
}
