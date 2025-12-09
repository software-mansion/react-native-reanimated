'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import {
  runOnUIAsync as RNRuntimeRunOnUIAsync,
  runOnUISync as RNRuntimeRunOnUISync,
  scheduleOnUI as RNRuntimeScheduleOnUI,
} from '../threads';
import type { WorkletFunction } from '../types';
// import { createSerializable } from './serializable';
import { serializableMappingCache } from './serializableMappingCache';
import type {
  // PureShareableGuest,
  SerializableRef,
  Shareable,
  ShareableGuestDecorator,
  ShareableHost,
} from './types';

export function __installUnpacker() {
  // const serializer =
  //   globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE
  //     ? (value: unknown, _: unknown) => createSerializable(value)
  //     : globalThis._createSerializable;

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
      // console.log(new Error().stack);
      return proxy.runOnUISync(
        globalThis.__makeSerializableCloneOnUIRecursive(() => {
          'worklet';
          // console.log(new Error().stack);
          return globalThis.__makeSerializableCloneOnUIRecursive(
            worklet(...args)
          );
        })
      );
    }) as typeof RNRuntimeRunOnUISync;

    scheduleOnUI = ((worklet: WorkletFunction, ...args: unknown[]) => {
      proxy.scheduleOnUI(
        globalThis.__makeSerializableCloneOnUIRecursive(() => {
          'worklet';
          return globalThis.__makeSerializableCloneOnUIRecursive(
            worklet(...args)
          );
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
  function shareableGuestUnpacker<TShared = unknown>(
    shareableRef: SerializableRef<TShared> | Shareable<TShared>,
    guestDecorator?: ShareableGuestDecorator<TShared>
  ): Shareable<TShared> {
    type HostRuntimeType = ShareableHost<TShared>;
    // type RefRuntimeType = SerializableRef<TShared>;

    const get = () => {
      'worklet';
      console.log('Getting shareable value from guest unpacker', shareableRef);
      return (shareableRef as HostRuntimeType).value;
    };

    const setWithValue = (value: TShared) => {
      'worklet';
      (shareableRef as HostRuntimeType).value = value;
    };

    const setWithSetter = (setter: (prev: TShared) => TShared) => {
      'worklet';
      const currentValue = (shareableRef as HostRuntimeType).value;
      const newValue = setter(currentValue);
      (shareableRef as HostRuntimeType).value = newValue;
    };

    // let shareableGuest = {
    //   getAsync() {
    //     return runOnUIAsync(get);
    //   },

    //   getSync() {
    //     return runOnUISync(get);
    //   },

    //   setAsync(value: TShared | ((prev: TShared) => TShared)) {
    //     if (typeof value === 'function') {
    //       scheduleOnUI(setWithSetter, value as (prev: TShared) => TShared);
    //     } else {
    //       scheduleOnUI(setWithValue, value);
    //     }
    //   },

    //   setSync(value: TShared | ((prev: TShared) => TShared)) {
    //     if (typeof value === 'function') {
    //       runOnUISync(setWithSetter, value as (prev: TShared) => TShared);
    //     } else {
    //       runOnUISync(setWithValue, value);
    //     }
    //   },

    //   isHost: false,
    //   __shareableRef: shareableRef as unknown as boolean, // TODO: temporary
    // } as PureShareableGuest<TShared>;

    // @ts-expect-error wwww
    shareableRef.getAsync = () => {
      return runOnUIAsync(get);
    };

    // @ts-expect-error wwww
    shareableRef.getSync = () => {
      return runOnUISync(get);
    };

    // @ts-expect-error wwww
    shareableRef.setAsync = (value: TShared | ((prev: TShared) => TShared)) => {
      if (typeof value === 'function') {
        scheduleOnUI(setWithSetter, value as (prev: TShared) => TShared);
      } else {
        scheduleOnUI(setWithValue, value);
      }
    };

    // @ts-expect-error wwww
    shareableRef.setSync = (value: TShared | ((prev: TShared) => TShared)) => {
      if (typeof value === 'function') {
        runOnUISync(setWithSetter, value as (prev: TShared) => TShared);
      } else {
        runOnUISync(setWithValue, value);
      }
    };

    // @ts-expect-error wwww
    shareableRef.isHost = false;

    // if (guestDecorator) {
    //   shareableGuest = guestDecorator(shareableGuest);
    // }
    if (guestDecorator) {
      // @ts-expect-error wwww
      shareableRef = guestDecorator(shareableRef);
    }

    // const shareable = shareableGuest;

    // @ts-expect-error wwwww
    memoize(shareableRef, shareableRef);
    // memoize(shareableRef, shareableRef as RefRuntimeType);
    // @ts-expect-error www
    return shareableRef;
  }

  globalThis.__shareableGuestUnpacker = shareableGuestUnpacker;
}

export type ShareableUnpacker<TValue = unknown> = (
  shareableRef: SerializableRef<TValue>,
  decorateGuest?: ShareableGuestDecorator<TValue>
) => Shareable<TValue>;
