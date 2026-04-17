'use strict';

import { RuntimeKind } from './runtimeKind';

export function getRuntimeId(): number {
  return globalThis.__RUNTIME_ID;
}

export function getRuntimeName(): string {
  return globalThis.__RUNTIME_NAME;
}

/**
 * The ID of the [UI Worklet
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 */
export const UIRuntimeId = RuntimeKind.UI as 2;

const RNRuntimeId = RuntimeKind.ReactNative as 1;

if (!globalThis.__RUNTIME_ID) {
  // The only runtime that doesn't have these values set initially is the RN Runtime.
  globalThis.__RUNTIME_ID = RNRuntimeId;
  globalThis.__RUNTIME_NAME = 'RN';
}
