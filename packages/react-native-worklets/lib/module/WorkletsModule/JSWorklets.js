/* eslint-disable reanimated/use-reanimated-error */
'use strict';

import { mockedRequestAnimationFrame } from "../animationFrameQueue/mockedRequestAnimationFrame.js";
import { isJest } from "../PlatformChecker.js";
import { WorkletsError } from "../WorkletsError.js";
export function createJSWorkletsModule() {
  return new JSWorklets();
}

// In Node.js environments (like when static rendering with Expo Router)
// requestAnimationFrame is unavailable, so we use our mock.
// It also has to be mocked for Jest purposes (see `initializeUIRuntime`).
const requestAnimationFrameImpl = isJest() || !globalThis.requestAnimationFrame ? mockedRequestAnimationFrame : globalThis.requestAnimationFrame;
class JSWorklets {
  makeShareableClone() {
    throw new WorkletsError('makeShareableClone should never be called in JSWorklets.');
  }
  scheduleOnUI(worklet) {
    // TODO: `requestAnimationFrame` should be used exclusively in Reanimated

    // @ts-ignore web implementation has still not been updated after the rewrite,
    // this will be addressed once the web implementation updates are ready
    requestAnimationFrameImpl(worklet);
  }
  executeOnUIRuntimeSync(_shareable) {
    throw new WorkletsError('`executeOnUIRuntimeSync` is not available in JSWorklets.');
  }
  createWorkletRuntime(_name, _initializer) {
    throw new WorkletsError('createWorkletRuntime is not available in JSWorklets.');
  }
  scheduleOnRuntime() {
    throw new WorkletsError('scheduleOnRuntime is not available in JSWorklets.');
  }
}
//# sourceMappingURL=JSWorklets.js.map