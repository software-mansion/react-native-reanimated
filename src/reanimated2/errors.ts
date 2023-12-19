'use strict';
type StackDetails = [Error, number, number];

const _workletStackDetails = new Map<number, StackDetails>();

export function registerWorkletStackDetails(
  hash: number,
  stackDetails: StackDetails
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
}: {
  message: string;
  stack?: string;
}) {
  const error = new Error();
  error.message = message;
  error.stack = stack ? processStack(stack) : undefined;
  error.name = 'ReanimatedError';
  // @ts-ignore React Native's ErrorUtils implementation extends the Error type with jsEngine field
  error.jsEngine = 'reanimated';
  // @ts-ignore the reportFatalError method is an internal method of ErrorUtils not exposed in the type definitions
  global.ErrorUtils.reportFatalError(error);
}
