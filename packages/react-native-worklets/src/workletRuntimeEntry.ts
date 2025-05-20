/* eslint-disable reanimated/use-worklets-error */
'use strict';

import { bundleValueUnpacker } from './bundleUnpacker';
import { setupCallGuard } from './initializers';
import type { ValueUnpacker } from './workletTypes';

/**
 * This function is an entry point for Worklet Runtimes. We can use it to setup
 * necessary tools, like the ValueUnpacker.
 *
 * We must throw an error at the end of this function to prevent the bundle to
 * continue executing. This is because the next module to be ran would be the
 * React Native one, and it would break the Worklet Runtime if initialized. The
 * error is caught in C++ code.
 *
 * This function has no effect on the RN Runtime.
 */
export function initializeLibraryOnWorkletRuntime() {
  if (globalThis._WORKLET) {
    globalThis.__valueUnpacker = bundleValueUnpacker as ValueUnpacker;

    setupCallGuard();
    // We have to throw an error here because otherwise
    // the next module to be ran would be the React Native one,
    // and we cannot allow it on a Worklet Runtime.
    throw new Error('Worklets initialized successfully');
  }
}

initializeLibraryOnWorkletRuntime();
