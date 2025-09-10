'use strict';

import { init } from "./initializers.js";
import { SHOULD_BE_USE_WEB } from "./PlatformChecker/index.js";
import { RuntimeKind } from "./runtimeKind.js";
import { WorkletsError } from "./WorkletsError.js";

/**
 * This function is an entry point for Worklet Runtimes. We can use it to setup
 * necessary tools, like the ValueUnpacker.
 *
 * We must throw an error at the end of this function to prevent the bundle to
 * continue executing. This is because the next module to be ran would be the
 * React Native one, and it would break the Worklet Runtime if initialized. The
 * error is caught in C++ code.
 *
 * This function has no effect on the RN Runtime beside setting the
 * `_WORKLETS_BUNDLE_MODE` flag.
 */
export function bundleModeInit() {
  if (SHOULD_BE_USE_WEB) {
    return;
  }
  globalThis._WORKLETS_BUNDLE_MODE = true;
  const runtimeKind = globalThis.__RUNTIME_KIND;
  if (runtimeKind && runtimeKind !== RuntimeKind.ReactNative) {
    /**
     * We shouldn't call `init()` on RN Runtime here, as it would initialize our
     * module before React Native has configured the RN Runtime.
     */
    init();
    throw new WorkletsError('Worklets initialized successfully');
  }
}
bundleModeInit();
//# sourceMappingURL=workletRuntimeEntry.js.map