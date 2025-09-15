'use strict';

import { IS_JEST } from '../PlatformChecker';
import { mockedRequestAnimationFrame } from '../runLoop/uiRuntime/mockedRequestAnimationFrame';
import { WorkletsError } from '../WorkletsError';
export function createJSWorkletsModule() {
  return new JSWorklets();
}

// In Node.js environments (like when static rendering with Expo Router)
// requestAnimationFrame is unavailable, so we use our mock.
// It also has to be mocked for Jest purposes (see `initializeUIRuntime`).
const requestAnimationFrameImpl = IS_JEST || !globalThis.requestAnimationFrame ? mockedRequestAnimationFrame : globalThis.requestAnimationFrame;
class JSWorklets {
  createSerializable() {
    throw new WorkletsError('createSerializable should never be called in JSWorklets.');
  }
  createSerializableString() {
    throw new WorkletsError('createSerializableString should never be called in JSWorklets.');
  }
  createSerializableNumber() {
    throw new WorkletsError('createSerializableNumber should never be called in JSWorklets.');
  }
  createSerializableBoolean() {
    throw new WorkletsError('createSerializableBoolean should never be called in JSWorklets.');
  }
  createSerializableBigInt() {
    throw new WorkletsError('createSerializableBigInt should never be called in JSWorklets.');
  }
  createSerializableUndefined() {
    throw new WorkletsError('createSerializableUndefined should never be called in JSWorklets.');
  }
  createSerializableNull() {
    throw new WorkletsError('createSerializableNull should never be called in JSWorklets.');
  }
  createSerializableTurboModuleLike() {
    throw new WorkletsError('createSerializableTurboModuleLike should never be called in JSWorklets.');
  }
  createSerializableObject() {
    throw new WorkletsError('createSerializableObject should never be called in JSWorklets.');
  }
  createSerializableMap() {
    throw new WorkletsError('createSerializableMap should never be called in JSWorklets.');
  }
  createSerializableSet() {
    throw new WorkletsError('createSerializableSet should never be called in JSWorklets.');
  }
  createSerializableImport() {
    throw new WorkletsError('createSerializableImport should never be called in JSWorklets.');
  }
  createSerializableHostObject() {
    throw new WorkletsError('createSerializableHostObject should never be called in JSWorklets.');
  }
  createSerializableArray() {
    throw new WorkletsError('createSerializableArray should never be called in JSWorklets.');
  }
  createSerializableInitializer() {
    throw new WorkletsError('createSerializableInitializer should never be called in JSWorklets.');
  }
  createSerializableFunction() {
    throw new WorkletsError('createSerializableFunction should never be called in JSWorklets.');
  }
  createSerializableWorklet() {
    throw new WorkletsError('createSerializableWorklet should never be called in JSWorklets.');
  }
  scheduleOnUI(worklet) {
    // TODO: `requestAnimationFrame` should be used exclusively in Reanimated

    // @ts-ignore web implementation has still not been updated after the rewrite,
    // this will be addressed once the web implementation updates are ready
    requestAnimationFrameImpl(worklet);
  }
  executeOnUIRuntimeSync() {
    throw new WorkletsError('`executeOnUIRuntimeSync` is not available in JSWorklets.');
  }
  createWorkletRuntime() {
    throw new WorkletsError('createWorkletRuntime is not available in JSWorklets.');
  }
  scheduleOnRuntime() {
    throw new WorkletsError('scheduleOnRuntime is not available in JSWorklets.');
  }
  createSynchronizable() {
    throw new WorkletsError('createSynchronizable should never be called in JSWorklets.');
  }
  synchronizableGetDirty() {
    throw new WorkletsError('synchronizableGetDirty should never be called in JSWorklets.');
  }
  synchronizableGetBlocking() {
    throw new WorkletsError('synchronizableGetBlocking should never be called in JSWorklets.');
  }
  synchronizableSetBlocking() {
    throw new WorkletsError('synchronizableSetBlocking should never be called in JSWorklets.');
  }
  synchronizableLock() {
    throw new WorkletsError('synchronizableLock should never be called in JSWorklets.');
  }
  synchronizableUnlock() {
    throw new WorkletsError('synchronizableUnlock should never be called in JSWorklets.');
  }
  reportFatalErrorOnJS() {
    throw new WorkletsError('reportFatalErrorOnJS should never be called in JSWorklets.');
  }
  getStaticFeatureFlag() {
    // mock implementation
    return false;
  }
  setDynamicFeatureFlag() {
    // noop
  }
}
//# sourceMappingURL=JSWorklets.js.map