'use strict';

import { valueUnpacker } from './valueUnpacker';
import { initializeWorkletRegistries } from './workletRegistry';

export function breakBundle() {
  if (globalThis._WORKLET) {
    // TODO: Try storing a raw pointer to the valueUnpacker and see what happens.
    // @ts-expect-error wwwww
    globalThis.__valueUnpacker = valueUnpacker;
    initializeWorkletRegistries();
    // eslint-disable-next-line reanimated/use-worklets-error
    throw new Error('o kur🐔a');
  }
}

breakBundle();
