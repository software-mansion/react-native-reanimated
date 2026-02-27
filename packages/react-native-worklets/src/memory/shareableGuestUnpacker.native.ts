'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import {
  runOnRuntimeSyncWithId as RNRuntimeRunOnRuntimeSyncFromId,
  scheduleOnRuntimeWithId as RNRuntimeScheduleOnRuntimeFromId,
} from '../runtimes';
import { runOnUIAsync as RNRuntimeRunOnUIAsync } from '../threads';
import type { WorkletFunction } from '../types';
import { createSerializable } from './serializable';
import { serializableMappingCache } from './serializableMappingCache';
import type {
  SerializableRef,
  Shareable,
  ShareableGuest,
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

  if (
    globalThis.__RUNTIME_KIND === 1 /* RuntimeKind.ReactNative */ ||
    globalThis._WORKLETS_BUNDLE_MODE_ENABLED
  ) {
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
        return globalThis.__serializer(worklet(...args));
      });
      return proxy.runOnRuntimeSyncWithId(hostId, serializedWorklet);
    }) as typeof RNRuntimeRunOnRuntimeSyncFromId;

    scheduleOnRuntimeFromId = ((
      hostId: number,
      worklet: WorkletFunction,
      ...args: unknown[]
    ) => {
      proxy.scheduleOnRuntimeWithId(
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
      // No-op on Worklet Runtimes outside of Bundle Mode.
    };
  }

  function shareableGuestUnpacker<TValue>(
    hostId: number,
    shareableRef: SerializableRef<TValue>,
    guestDecorator?: ShareableGuestDecorator<TValue>
  ): Shareable<TValue> {
    type Host = ShareableHost<TValue>;
    type Guest = ShareableGuest<TValue>;

    let shareableGuest = shareableRef as unknown as Shareable<TValue>;

    const get = () => {
      'worklet';
      return (shareableGuest as Host).value;
    };

    const setWithValue = (value: TValue) => {
      'worklet';
      (shareableGuest as Host).value = value;
    };

    const setWithSetter = (setter: (prev: TValue) => TValue) => {
      'worklet';
      const currentValue = (shareableGuest as Host).value;
      const newValue = setter(currentValue);
      (shareableGuest as Host).value = newValue;
    };

    shareableGuest.getAsync = () => {
      return runOnUIAsync(get);
    };

    shareableGuest.getSync = () => {
      return runOnRuntimeSyncFromId(hostId, get);
    };

    shareableGuest.setAsync = (value: TValue | ((prev: TValue) => TValue)) => {
      if (typeof value === 'function') {
        scheduleOnRuntimeFromId(
          hostId,
          setWithSetter,
          value as (prev: TValue) => TValue
        );
      } else {
        scheduleOnRuntimeFromId(hostId, setWithValue, value);
      }
    };

    shareableGuest.setSync = (value: TValue | ((prev: TValue) => TValue)) => {
      if (typeof value === 'function') {
        runOnRuntimeSyncFromId(
          hostId,
          setWithSetter,
          value as (prev: TValue) => TValue
        );
      } else {
        runOnRuntimeSyncFromId(hostId, setWithValue, value);
      }
    };

    shareableGuest.isHost = false;
    shareableGuest.__shareableRef = true;

    if (guestDecorator) {
      shareableGuest = guestDecorator(shareableGuest as Guest);
    }

    memoize(shareableGuest, shareableRef);
    return shareableGuest;
  }

  globalThis.__shareableGuestUnpacker = shareableGuestUnpacker;
}

export type ShareableUnpacker<TValue = unknown> = (
  hostId: number,
  shareableRef: SerializableRef<TValue>,
  decorateGuest?: ShareableGuestDecorator<TValue>
) => Shareable<TValue>;
