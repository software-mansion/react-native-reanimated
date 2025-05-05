'use strict';

import RNWorkletsTurboModule from './NativeWorkletsModule';

export const WorkletsTurboModule = globalThis._WORKLET
  ? ({} as any)
  : RNWorkletsTurboModule;
