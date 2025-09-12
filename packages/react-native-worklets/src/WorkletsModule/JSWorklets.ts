'use strict';

import { IS_JEST } from '../PlatformChecker';
import { mockedRequestAnimationFrame } from '../runLoop/uiRuntime/mockedRequestAnimationFrame';
import { WorkletsError } from '../WorkletsError';
import type { SerializableRef } from '../workletTypes';
import type { IWorkletsModule } from './workletsModuleProxy';

export function createJSWorkletsModule(): IWorkletsModule {
  return new JSWorklets();
}

// In Node.js environments (like when static rendering with Expo Router)
// requestAnimationFrame is unavailable, so we use our mock.
// It also has to be mocked for Jest purposes (see `initializeUIRuntime`).
const requestAnimationFrameImpl =
  IS_JEST || !globalThis.requestAnimationFrame
    ? mockedRequestAnimationFrame
    : globalThis.requestAnimationFrame;

class JSWorklets implements IWorkletsModule {
  createSerializable(): never {
    throw new WorkletsError(
      'createSerializable should never be called in JSWorklets.'
    );
  }

  createSerializableString(): never {
    throw new WorkletsError(
      'createSerializableString should never be called in JSWorklets.'
    );
  }

  createSerializableNumber(): never {
    throw new WorkletsError(
      'createSerializableNumber should never be called in JSWorklets.'
    );
  }

  createSerializableBoolean(): never {
    throw new WorkletsError(
      'createSerializableBoolean should never be called in JSWorklets.'
    );
  }

  createSerializableBigInt(): never {
    throw new WorkletsError(
      'createSerializableBigInt should never be called in JSWorklets.'
    );
  }

  createSerializableUndefined(): never {
    throw new WorkletsError(
      'createSerializableUndefined should never be called in JSWorklets.'
    );
  }

  createSerializableNull(): never {
    throw new WorkletsError(
      'createSerializableNull should never be called in JSWorklets.'
    );
  }

  createSerializableTurboModuleLike(): never {
    throw new WorkletsError(
      'createSerializableTurboModuleLike should never be called in JSWorklets.'
    );
  }

  createSerializableObject(): never {
    throw new WorkletsError(
      'createSerializableObject should never be called in JSWorklets.'
    );
  }

  createSerializableMap(): never {
    throw new WorkletsError(
      'createSerializableMap should never be called in JSWorklets.'
    );
  }

  createSerializableSet(): never {
    throw new WorkletsError(
      'createSerializableSet should never be called in JSWorklets.'
    );
  }

  createSerializableImport(): never {
    throw new WorkletsError(
      'createSerializableImport should never be called in JSWorklets.'
    );
  }

  createSerializableHostObject(): never {
    throw new WorkletsError(
      'createSerializableHostObject should never be called in JSWorklets.'
    );
  }

  createSerializableArray(): never {
    throw new WorkletsError(
      'createSerializableArray should never be called in JSWorklets.'
    );
  }

  createSerializableInitializer(): never {
    throw new WorkletsError(
      'createSerializableInitializer should never be called in JSWorklets.'
    );
  }

  createSerializableFunction(): never {
    throw new WorkletsError(
      'createSerializableFunction should never be called in JSWorklets.'
    );
  }

  createSerializableWorklet(): never {
    throw new WorkletsError(
      'createSerializableWorklet should never be called in JSWorklets.'
    );
  }

  scheduleOnUI<TValue>(worklet: SerializableRef<TValue>) {
    // TODO: `requestAnimationFrame` should be used exclusively in Reanimated

    // @ts-ignore web implementation has still not been updated after the rewrite,
    // this will be addressed once the web implementation updates are ready
    requestAnimationFrameImpl(worklet);
  }

  executeOnUIRuntimeSync(): never {
    throw new WorkletsError(
      '`executeOnUIRuntimeSync` is not available in JSWorklets.'
    );
  }

  createWorkletRuntime(): never {
    throw new WorkletsError(
      'createWorkletRuntime is not available in JSWorklets.'
    );
  }

  scheduleOnRuntime(): never {
    throw new WorkletsError(
      'scheduleOnRuntime is not available in JSWorklets.'
    );
  }

  createSynchronizable(): never {
    throw new WorkletsError(
      'createSynchronizable should never be called in JSWorklets.'
    );
  }

  synchronizableGetDirty(): never {
    throw new WorkletsError(
      'synchronizableGetDirty should never be called in JSWorklets.'
    );
  }

  synchronizableGetBlocking(): never {
    throw new WorkletsError(
      'synchronizableGetBlocking should never be called in JSWorklets.'
    );
  }

  synchronizableSetBlocking(): never {
    throw new WorkletsError(
      'synchronizableSetBlocking should never be called in JSWorklets.'
    );
  }

  synchronizableLock(): never {
    throw new WorkletsError(
      'synchronizableLock should never be called in JSWorklets.'
    );
  }

  synchronizableUnlock(): never {
    throw new WorkletsError(
      'synchronizableUnlock should never be called in JSWorklets.'
    );
  }

  reportFatalErrorOnJS(): never {
    throw new WorkletsError(
      'reportFatalErrorOnJS should never be called in JSWorklets.'
    );
  }

  getStaticFeatureFlag(): boolean {
    // mock implementation
    return false;
  }

  setDynamicFeatureFlag() {
    // noop
  }
}
