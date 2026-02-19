'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import {
  runOnRuntimeSyncFromId as RNRuntimeRunOnRuntimeSyncFromId,
  scheduleOnRuntimeFromId as RNRuntimeScheduleOnRuntimeFromId,
} from '../runtimes';
import { runOnUIAsync as RNRuntimeRunOnUIAsync } from '../threads';
import type { WorkletFunction } from '../types';
import { createSerializable } from './serializable';
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
  let runOnRuntimeSyncFromId: typeof RNRuntimeRunOnRuntimeSyncFromId;
  let scheduleOnRuntimeFromId: typeof RNRuntimeScheduleOnRuntimeFromId;
  let runOnUIAsync: typeof RNRuntimeRunOnUIAsync;
  let memoize: (
    unpacked: Shareable<unknown>,
    serialized: SerializableRef<unknown>
  ) => void;
  const serializer =
    globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE_ENABLED
      ? createSerializable
      : (value: unknown) => globalThis.__serializer(value);

  if (globalThis.__RUNTIME_KIND === 1 /* RuntimeKind.ReactNative */) {
    runOnRuntimeSyncFromId = RNRuntimeRunOnRuntimeSyncFromId;
    scheduleOnRuntimeFromId = RNRuntimeScheduleOnRuntimeFromId;
    runOnUIAsync = RNRuntimeRunOnUIAsync;
    memoize = (unpacked, serialized) => {
      serializableMappingCache.set(unpacked, serialized);
    };
  } else {
    const proxy = globalThis.__workletsModuleProxy;
    runOnRuntimeSyncFromId = ((
      hostId: number,
      worklet: WorkletFunction,
      ...args: unknown[]
    ) => {
      const serializedWorklet = serializer(() => {
        'worklet';
        return globalThis.__makeSerializableCloneOnUIRecursive(
          worklet(...args)
        );
      });
      return proxy.runOnRuntimeSyncFromId(hostId, serializedWorklet);
    }) as typeof RNRuntimeRunOnRuntimeSyncFromId;

    scheduleOnRuntimeFromId = ((
      hostId: number,
      worklet: WorkletFunction,
      ...args: unknown[]
    ) => {
      proxy.scheduleOnRuntimeFromId(
        hostId,
        serializer(() => {
          'worklet';
          return globalThis.__serializer(worklet(...args));
        })
      );
    }) as typeof RNRuntimeScheduleOnRuntimeFromId;

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
    hostId: number,
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

    // @ts-expect-error wwww
    shareableRef.getAsync = () => {
      return runOnUIAsync(get);
    };

    // @ts-expect-error wwww
    shareableRef.getSync = () => {
      return runOnRuntimeSyncFromId(hostId, get);
    };

    // @ts-expect-error wwww
    shareableRef.setAsync = (value: TShared | ((prev: TShared) => TShared)) => {
      if (typeof value === 'function') {
        scheduleOnRuntimeFromId(
          hostId,
          setWithSetter,
          value as (prev: TShared) => TShared
        );
      } else {
        scheduleOnRuntimeFromId(hostId, setWithValue, value);
      }
    };

    // @ts-expect-error wwww
    shareableRef.setSync = (value: TShared | ((prev: TShared) => TShared)) => {
      if (typeof value === 'function') {
        runOnRuntimeSyncFromId(
          hostId,
          setWithSetter,
          value as (prev: TShared) => TShared
        );
      } else {
        runOnRuntimeSyncFromId(hostId, setWithValue, value);
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
  hostId: number,
  shareableRef: SerializableRef<TValue>,
  decorateGuest?: ShareableGuestDecorator<TValue>
) => Shareable<TValue>;
