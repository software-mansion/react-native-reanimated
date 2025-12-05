'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import {
  runOnUIAsync as RNRuntimeRunOnUIAsync,
  runOnUISync as RNRuntimeRunOnUISync,
  scheduleOnUI as RNRuntimeScheduleOnUI,
} from '../threads';
import type { WorkletFunction } from '../types';
import { createSerializable } from './serializable';
import { serializableMappingCache } from './serializableMappingCache';
import type { SerializableRef, Shareable, ShareableHost } from './types';

export function __installUnpacker() {
  const serializer =
    globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE
      ? (value: unknown, _: unknown) => createSerializable(value)
      : globalThis._createSerializable;

  let runOnUISync: typeof RNRuntimeRunOnUISync;
  let scheduleOnUI: typeof RNRuntimeScheduleOnUI;
  let runOnUIAsync: typeof RNRuntimeRunOnUIAsync;
  let memoize: (
    unpacked: Shareable<unknown>,
    serialized: SerializableRef<unknown>
  ) => void;

  if (globalThis.__RUNTIME_KIND === 1 /* RuntimeKind.ReactNative */) {
    runOnUISync = RNRuntimeRunOnUISync;
    scheduleOnUI = RNRuntimeScheduleOnUI;
    runOnUIAsync = RNRuntimeRunOnUIAsync;
    memoize = (unpacked, serialized) => {
      serializableMappingCache.set(unpacked, serialized);
    };
  } else {
    const proxy = globalThis.__workletsModuleProxy;
    runOnUISync = ((worklet: WorkletFunction, ...args: unknown[]) => {
      return proxy.runOnUISync(
        serializer(() => {
          'worklet';
          return worklet(...args);
        })
      );
    }) as typeof RNRuntimeRunOnUISync;

    scheduleOnUI = ((worklet: WorkletFunction, ...args: unknown[]) => {
      proxy.scheduleOnUI(
        serializer(() => {
          'worklet';
          worklet(...args);
        })
      );
    }) as typeof RNRuntimeScheduleOnUI;

    runOnUIAsync = () => {
      throw new WorkletsError(
        'runOnUIAsync is not supported on Worklet Runtimes yet'
      );
    };

    memoize = () => {
      // No-op on Worklet Runtimes.
    };
  }

  /**
   * @param shareableRef - Is of type {@link SerializableRef} on the Ref Runtime
   *   side and of type {@link Shareable} on the Host Runtime side.
   * @param isHost - Whether the unpacker is running on the Host Runtime side.
   * @param initial - Initial value to use when running on the Host Runtime
   *   side. Undefined on the Ref Runtime side.
   */
  function shareableUnpacker<TValue = unknown>(
    shareableRef: SerializableRef<TValue> | Shareable<TValue>,
    isHost: boolean,
    initial?: TValue,
    inline?: boolean
  ): Shareable<TValue> {
    type HostRuntimeType = ShareableHost<TValue>;
    type RefRuntimeType = SerializableRef<TValue>;

    let shareable: Shareable<TValue>;

    if (isHost) {
      // console.log('initial on host', initial);

      initial =
        typeof initial === 'function' ? (initial as () => TValue)() : initial;

      if (inline) {
        const inlineShareable = initial as Shareable<TValue>;
        inlineShareable.isHost = true;
        inlineShareable.__shareableRef = true;
        return inlineShareable;
      } else {
        return {
          isHost: true,
          __shareableRef: true,
          value: initial,
        } as Shareable<TValue>;
      }
    } else {
      const get = () => {
        'worklet';
        return (shareableRef as HostRuntimeType).value;
      };

      const setWithValue = (value: TValue) => {
        'worklet';
        (shareableRef as HostRuntimeType).value = value;
      };

      const setWithSetter = (setter: (prev: TValue) => TValue) => {
        'worklet';
        const currentValue = (shareableRef as HostRuntimeType).value;
        const newValue = setter(currentValue);
        (shareableRef as HostRuntimeType).value = newValue;
      };

      shareable = {
        getAsync() {
          return runOnUIAsync(get);
        },

        getSync() {
          return runOnUISync(get);
        },

        setAsync(value: TValue | ((prev: TValue) => TValue)) {
          if (typeof value === 'function') {
            scheduleOnUI(setWithSetter, value as (prev: TValue) => TValue);
          } else {
            scheduleOnUI(setWithValue, value);
          }
        },

        setSync(value: TValue | ((prev: TValue) => TValue)) {
          if (typeof value === 'function') {
            runOnUISync(setWithSetter, value as (prev: TValue) => TValue);
          } else {
            runOnUISync(setWithValue, value);
          }
        },

        isHost: false,
        __shareableRef: true,
      } as const;
    }

    memoize(shareable, shareableRef as RefRuntimeType);
    return shareable;
  }

  globalThis.__shareableUnpacker = shareableUnpacker;
}

export type ShareableUnpacker<TValue = unknown> = (
  shareableRef: SerializableRef<TValue>,
  isHost: boolean
) => Shareable<TValue>;
