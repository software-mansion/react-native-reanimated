'use strict';

import { RuntimeKind } from '../runtimeKind';
import type { Spec } from './NativeWorkletsModule';

export const WorkletsTurboModule: Spec | null | undefined =
  globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative
    ? (require('./NativeWorkletsModule') as { default: Spec | null }).default
    : // Worklet Runtimes evaluate this module too, but the Turbo Module isn't
      // available there. `NativeWorkletsModule` is required lazily, so it is
      // evaluated only on the RN Runtime, also when Metro `inlineRequires` is
      // disabled.
      null;
