'use strict';

import { bundleModeInit } from './workletRuntimeEntry';

// @ts-expect-error We must trick the bundler to include
// the `workletRuntimeEntry` file the way it cannot optimize it out.
if (globalThis._ALWAYS_FALSE) {
  // Bundle mode.
  bundleModeInit();
}

export {
  getMemorySafeCapturableConsole,
  init,
  setupConsole,
} from './initializers';
