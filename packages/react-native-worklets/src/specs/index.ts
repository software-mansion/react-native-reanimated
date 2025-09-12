'use strict';

import { RuntimeKind } from '../runtimeKind';
import type { Spec } from './NativeWorkletsModule';
import RNWorkletsTurboModule from './NativeWorkletsModule';

export const WorkletsTurboModule: Spec | null =
  globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative
    ? RNWorkletsTurboModule
    : // In Bundle Mode, on Worklet Runtimes `RNWorkletsTurboModule` isn't
      // available and shouldn't be accessed. We return null here
      // to keep the same codebase for the Bundle Mode and legacy behavior.
      null;
