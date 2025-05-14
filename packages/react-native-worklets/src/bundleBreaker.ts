'use strict';

import { setupCallGuard } from './initializers';
import { __valueUnpacker } from './valueUnpacker';
import { initializeWorkletRegistries } from './workletRegistry';

export function breakBundle() {
  if (globalThis._WORKLET) {
    // TODO: Try storing a raw pointer to the valueUnpacker and see what happens.
    // @ts-expect-error wwwww
    globalThis.__valueUnpacker = __valueUnpacker;
    // @ts-expect-error wwwww
    globalThis._BROKEN = true;

    initializeWorkletRegistries();
    setupCallGuard();
    // eslint-disable-next-line reanimated/use-worklets-error
    throw new Error('o kur🐔a');
  }
}

breakBundle();
