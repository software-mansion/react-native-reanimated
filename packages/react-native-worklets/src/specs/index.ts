'use strict';

import { RuntimeKind } from '../runtimeKind';
import type { Spec } from './NativeWorkletsModule';
import RNWorkletsTurboModule from './NativeWorkletsModule';

export const WorkletsTurboModule: Spec | null | undefined =
  globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative
    ? RNWorkletsTurboModule
    : // On Worklet Runtimes `RNWorkletsTurboModule` isn't
      // available and shouldn't be accessed.
      null;
