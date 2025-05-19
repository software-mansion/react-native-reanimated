'use strict';

import { setupCallGuard } from './initializers';
import { __valueUnpacker } from './bundleUnpacker';
import type { ValueUnpacker } from './workletTypes';

function breakBundle() {
  if (globalThis._WORKLET) {
    // TODO: Try storing a raw pointer to the valueUnpacker and see what happens.
    globalThis.__valueUnpacker = __valueUnpacker as ValueUnpacker;

    setupCallGuard();
    // eslint-disable-next-line reanimated/use-worklets-error
    throw new Error('o kur🐔a');
  }
}

breakBundle();
