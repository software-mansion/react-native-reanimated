'use strict';

import { setupCallGuard } from './initializers';
import { valueUnpacker } from './bundleUnpacker';
import type { ValueUnpacker } from './workletTypes';

export function initializeLibraryOnWorkletRuntime() {
  if (globalThis._WORKLET) {
    globalThis._log('Worklets initialized successfully');
    // TODO: Try storing a raw pointer to the valueUnpacker and see what happens.
    globalThis.__valueUnpacker = valueUnpacker as ValueUnpacker;

    setupCallGuard();
    // eslint-disable-next-line reanimated/use-worklets-error
    throw new Error("Worklets initialized successfully");
  }
}

initializeLibraryOnWorkletRuntime();

