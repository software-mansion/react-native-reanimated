'use strict';

import { RuntimeKind } from '../runtimeKind';
import RNWorkletsTurboModule from './NativeWorkletsModule';
export const WorkletsTurboModule = globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative ? RNWorkletsTurboModule :
// In Bundle Mode, on Worklet Runtimes `RNWorkletsTurboModule` isn't
// available and shouldn't be accessed. We return null here
// to keep the same codebase for the Bundle Mode and legacy behavior.
null;
//# sourceMappingURL=index.js.map