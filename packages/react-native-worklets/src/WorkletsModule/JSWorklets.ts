'use strict';

import { IS_JEST } from '../PlatformChecker';
import { mockedRequestAnimationFrame } from '../runLoop/mockedRequestAnimationFrame';
import { WorkletsError } from '../WorkletsError';
import type { ShareableRef } from '../workletTypes';
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
  makeShareableClone(): never {
    throw new WorkletsError(
      'makeShareableClone should never be called in JSWorklets.'
    );
  }

  makeShareableString(): never {
    throw new WorkletsError(
      'makeShareableString should never be called in JSWorklets.'
    );
  }

  makeShareableNumber(): never {
    throw new WorkletsError(
      'makeShareableNumber should never be called in JSWorklets.'
    );
  }

  makeShareableBoolean(): never {
    throw new WorkletsError(
      'makeShareableBoolean should never be called in JSWorklets.'
    );
  }

  makeShareableBigInt(): never {
    throw new WorkletsError(
      'makeShareableBigInt should never be called in JSWorklets.'
    );
  }

  makeShareableUndefined(): never {
    throw new WorkletsError(
      'makeShareableUndefined should never be called in JSWorklets.'
    );
  }

  makeShareableNull(): never {
    throw new WorkletsError(
      'makeShareableNull should never be called in JSWorklets.'
    );
  }

  makeShareableTurboModuleLike(): never {
    throw new WorkletsError(
      'makeShareableTurboModuleLike should never be called in JSWorklets.'
    );
  }

  makeShareableObject(): never {
    throw new WorkletsError(
      'makeShareableObject should never be called in JSWorklets.'
    );
  }

  makeShareableMap(): never {
    throw new WorkletsError(
      'makeShareableMap should never be called in JSWorklets.'
    );
  }

  makeShareableSet(): never {
    throw new WorkletsError(
      'makeShareableSet should never be called in JSWorklets.'
    );
  }

  makeShareableImport(): never {
    throw new WorkletsError(
      'makeShareableImport should never be called in JSWorklets.'
    );
  }

  makeShareableHostObject(): never {
    throw new WorkletsError(
      'makeShareableHostObject should never be called in JSWorklets.'
    );
  }

  makeShareableArray(): never {
    throw new WorkletsError(
      'makeShareableArray should never be called in JSWorklets.'
    );
  }

  makeShareableInitializer(): never {
    throw new WorkletsError(
      'makeShareableInitializer should never be called in JSWorklets.'
    );
  }

  makeShareableFunction(): never {
    throw new WorkletsError(
      'makeShareableRemoteFunction should never be called in JSWorklets.'
    );
  }

  makeShareableWorklet(): never {
    throw new WorkletsError(
      'makeShareableWorklet should never be called in JSWorklets.'
    );
  }

  scheduleOnUI<TValue>(worklet: ShareableRef<TValue>) {
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

  makeSynchronizable(): never {
    throw new WorkletsError(
      'makeSynchronizable should never be called in JSWorklets.'
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

  synchronizableSetDirty(): never {
    throw new WorkletsError(
      'synchronizableSetDirty should never be called in JSWorklets.'
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

  setDynamicFeatureFlag(_name: string, _value: boolean) {
    // noop
  }
}
