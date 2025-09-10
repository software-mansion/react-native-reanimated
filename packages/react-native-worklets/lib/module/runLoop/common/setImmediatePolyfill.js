'use strict';

export function setupSetImmediate() {
  'worklet';

  const setImmediatePolyfill = (callback, ...args) => {
    return setTimeout(callback, 0, ...args);
  };
  const clearImmediatePolyfill = immediateHandle => {
    clearTimeout(immediateHandle);
  };
  globalThis.setImmediate = setImmediatePolyfill;
  globalThis.clearImmediate = clearImmediatePolyfill;
}
//# sourceMappingURL=setImmediatePolyfill.js.map