'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import { RuntimeKind } from '../runtimeKind';
import { init } from './initializers';

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
  // Worklets Babel Plugin replaces `false` with `true` here
  // when Bundle Mode is enabled.
  globalThis._WORKLETS_BUNDLE_MODE = false;

  if (!globalThis._WORKLETS_BUNDLE_MODE) {
    return;
  }

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
