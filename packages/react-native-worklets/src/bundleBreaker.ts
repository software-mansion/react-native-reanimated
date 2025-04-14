'use strict';

import { initializeWorkletRegistries } from './workletRegistry';
import { valueUnpacker } from './valueUnpacker';

export function breakBundle() {
  if (globalThis._WORKLET) {
    // TODO: Try storing a raw pointer to the valueUnpacker and see what happens.
    globalThis.__valueUnpacker = valueUnpacker;
    initializeWorkletRegistries();
    throw new Error('o kur🐔a');
  }
}

breakBundle();
