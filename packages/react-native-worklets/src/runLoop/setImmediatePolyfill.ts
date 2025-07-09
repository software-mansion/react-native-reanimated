'use strict';

export function setupSetImmediate() {
  'worklet';

  const setImmediatePolyfill = (
    callback: (...args: unknown[]) => void,
    ...args: unknown[]
  ) => {
    setTimeout(callback, 0, ...args);
  };

  const clearImmediatePolyfill = (id: number) => {
    clearTimeout(id);
  };

  // @ts-expect-error TODO:
  globalThis.setImmediate = setImmediatePolyfill;
  // @ts-expect-error TODO:
  globalThis.clearImmediate = clearImmediatePolyfill;
}
