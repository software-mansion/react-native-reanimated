'use strict';

export function setupSetImmediate() {
  'worklet';

  const setImmediatePolyfill = (
    callback: (...args: unknown[]) => void,
    ...args: unknown[]
  ) => {
    return setTimeout(callback, 0, ...args);
  };

  const clearImmediatePolyfill = (immediateHandle: number) => {
    clearTimeout(immediateHandle);
  };

  globalThis.setImmediate =
    setImmediatePolyfill as unknown as typeof setImmediate;
  globalThis.clearImmediate = clearImmediatePolyfill as typeof clearImmediate;
}
