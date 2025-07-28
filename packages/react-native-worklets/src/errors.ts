'use strict';

import { WorkletsError } from './WorkletsError';
import type { WorkletStackDetails } from './workletTypes';

const _workletStackDetails = new Map<number, WorkletStackDetails>();

export function registerWorkletStackDetails(
  hash: number,
  stackDetails: WorkletStackDetails
) {
  _workletStackDetails.set(hash, stackDetails);
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

function processStack(stack?: string): string | undefined {
  if (stack === '' || stack === undefined) {
    return undefined;
  }
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

export interface RNError extends Error {
  jsEngine: string;
}

/**
 * Remote error is an error coming from a Worklet Runtime that we bubble up to
 * the RN Runtime.
 */
export function reportFatalRemoteError(
  { message, stack, name, jsEngine }: RNError,
  force: boolean
): void {
  const error = new WorkletsError() as RNError;
  error.message = message;
  error.stack = processStack(stack);
  error.name = name;
  error.jsEngine = jsEngine;
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
