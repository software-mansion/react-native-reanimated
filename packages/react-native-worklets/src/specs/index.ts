'use strict';

import type { Spec } from './NativeWorkletsModule';
import RNWorkletsTurboModule from './NativeWorkletsModule';

export const WorkletsTurboModule: Spec | null = globalThis._WORKLET
  ? null
  : RNWorkletsTurboModule;
