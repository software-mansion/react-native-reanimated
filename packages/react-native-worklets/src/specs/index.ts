'use strict';

import { RuntimeKind } from '../runtimeKind';
import type { Spec } from './NativeWorkletsModule';
import RNWorkletsTurboModule from './NativeWorkletsModule';

export const WorkletsTurboModule: Spec | null =
  globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative
    ? RNWorkletsTurboModule
    : null;
