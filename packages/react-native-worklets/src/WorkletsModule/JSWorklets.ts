'use strict';

import { IS_JEST } from '../PlatformChecker';
import { mockedRequestAnimationFrame } from '../runLoop/mockedRequestAnimationFrame';
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
  createSerializable<TValue>(): SerializableRef<TValue> {
    throw new WorkletsError(
      'createSerializable should never be called in JSWorklets.'
    );
  }

  createSerializableString(): SerializableRef<string> {
    throw new WorkletsError(
      'createSerializableString should never be called in JSWorklets.'
    );
  }

  createSerializableNumber(): SerializableRef<number> {
    throw new WorkletsError(
      'createSerializableNumber should never be called in JSWorklets.'
    );
  }

  createSerializableBoolean(): SerializableRef<boolean> {
    throw new WorkletsError(
      'createSerializableBoolean should never be called in JSWorklets.'
    );
  }

  createSerializableBigInt(): SerializableRef<bigint> {
    throw new WorkletsError(
      'createSerializableBigInt should never be called in JSWorklets.'
    );
  }

  createSerializableUndefined(): SerializableRef<undefined> {
    throw new WorkletsError(
      'createSerializableUndefined should never be called in JSWorklets.'
    );
  }

  createSerializableNull(): SerializableRef<null> {
    throw new WorkletsError(
      'createSerializableNull should never be called in JSWorklets.'
    );
  }

  createSerializableTurboModuleLike<T extends object>(): SerializableRef<T> {
    throw new WorkletsError(
      'createSerializableTurboModuleLike should never be called in JSWorklets.'
    );
  }

  createSerializableObject<T extends object>(): SerializableRef<T> {
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

  createSerializableHostObject<T extends object>(): SerializableRef<T> {
    throw new WorkletsError(
      'createSerializableHostObject should never be called in JSWorklets.'
    );
  }

  createSerializableArray(): SerializableRef<unknown[]> {
    throw new WorkletsError(
      'createSerializableArray should never be called in JSWorklets.'
    );
  }

  createSerializableInitializer(): SerializableRef<object> {
    throw new WorkletsError(
      'createSerializableInitializer should never be called in JSWorklets.'
    );
  }

  createSerializableFunction<TArgs extends unknown[], TReturn>(
    _func: (...args: TArgs) => TReturn
  ): SerializableRef<TReturn> {
    throw new WorkletsError(
      'createSerializableFunction should never be called in JSWorklets.'
    );
  }

  createSerializableWorklet(): SerializableRef<object> {
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

  executeOnUIRuntimeSync<T, R>(_shareable: SerializableRef<T>): R {
    throw new WorkletsError(
      '`executeOnUIRuntimeSync` is not available in JSWorklets.'
    );
  }

  createWorkletRuntime(): never {
    throw new WorkletsError(
      'createWorkletRuntime is not available in JSWorklets.'
    );
  }

  scheduleOnRuntime() {
    throw new WorkletsError(
      'scheduleOnRuntime is not available in JSWorklets.'
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
