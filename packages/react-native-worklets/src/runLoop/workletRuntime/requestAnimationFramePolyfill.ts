'use strict';

export function setupRequestAnimationFrame(animationQueuePollingRate: number) {
  'worklet';
  const UNREPORTABLE_ERROR_MESSAGE =
    '[Worklets] A requestAnimationFrame callback threw a value that cannot be reported.';
  const timeoutInterval = animationQueuePollingRate;

  let queuedCallbacks: ((timestamp: number) => void)[] = [];
  let queuedCallbacksBegin = 0;
  let queuedCallbacksEnd = 0;

  let flushedCallbacks = queuedCallbacks;
  let flushedCallbacksBegin = 0;
  let flushedCallbacksEnd = 0;

  let flushRequested = false;

  function flushAnimationFrame() {
    flushRequested = false;
    const timestamp = performance.now();

    flushedCallbacks = queuedCallbacks;
    queuedCallbacks = [];

    flushedCallbacksBegin = queuedCallbacksBegin;
    flushedCallbacksEnd = queuedCallbacksEnd;
    queuedCallbacksBegin = queuedCallbacksEnd;

    const errors: unknown[] = [];
    for (const callback of flushedCallbacks) {
      try {
        callback(timestamp);
      } catch (error) {
        errors.push(error);
      }
      drainMicrotasks(errors);
    }

    flushedCallbacksBegin = flushedCallbacksEnd;
    flushedCallbacks = [];

    throwErrors(errors);
  }

  function drainMicrotasks(errors: unknown[]) {
    for (;;) {
      try {
        globalThis.__drainMicrotasks();
        return;
      } catch (error) {
        errors.push(error);
      }
    }
  }

  function throwErrors(errors: unknown[]) {
    if (errors.length === 0) {
      return;
    }
    for (let i = 1; i < errors.length; i++) {
      reportError(errors[i]);
    }
    throw errors[0];
  }

  function reportError(error: unknown) {
    try {
      const { message, stack, name } = describeError(error);
      globalThis.__workletsModuleProxy.reportFatalErrorOnJS(
        message,
        stack,
        name
      );
    } catch {
      globalThis.__workletsModuleProxy.reportFatalErrorOnJS(
        UNREPORTABLE_ERROR_MESSAGE,
        '',
        'Error'
      );
    }
  }

  function describeError(error: unknown) {
    if (error instanceof Error) {
      return {
        message: typeof error.message === 'string' ? error.message : '',
        stack: typeof error.stack === 'string' ? error.stack : '',
        name: typeof error.name === 'string' ? error.name : 'Error',
      };
    }
    return { message: describeThrownValue(error), stack: '', name: 'Error' };
  }

  function describeThrownValue(value: unknown): string {
    try {
      return String(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }

  globalThis.requestAnimationFrame = (
    callback: (timestamp: number) => void
  ): number => {
    const handle = queuedCallbacksEnd++;

    queuedCallbacks.push(callback);
    if (!flushRequested) {
      flushRequested = true;

      setTimeout(flushAnimationFrame, timeoutInterval);
    }
    return handle;
  };

  globalThis.cancelAnimationFrame = ((handle: number) => {
    if (handle < flushedCallbacksBegin || handle >= queuedCallbacksEnd) {
      return;
    }

    if (handle < flushedCallbacksEnd) {
      flushedCallbacks[handle - flushedCallbacksBegin] = () => {};
    } else {
      queuedCallbacks[handle - queuedCallbacksBegin] = () => {};
    }
  }) as typeof globalThis.cancelAnimationFrame;
}
