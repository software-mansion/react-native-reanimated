/* eslint-disable n/no-missing-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

import type {
  runOnRuntimeAsyncWithId as BundleRunOnRuntimeAsyncWithId,
  runOnRuntimeSyncWithId as BundleRunOnRuntimeSyncWithId,
  scheduleOnRuntimeWithId as BundleScheduleOnRuntimeWithId,
} from '../runtimes';
import type { WorkletFunction } from '../types';
import type {
  SerializableRef,
  Shareable,
  ShareableGuest,
  ShareableGuestDecorator,
  ShareableHost,
} from './types';

export function installShareableGuestUnpacker() {
  'worklet';
  'no-worklet-closure';
  let runOnRuntimeSyncFromId: typeof BundleRunOnRuntimeSyncWithId;
  let runOnRuntimeAsyncFromId: typeof BundleRunOnRuntimeAsyncWithId;
  let memoize: (
    unpacked: Shareable<unknown>,
    serialized: SerializableRef<unknown>
  ) => void;

  let scheduleOnRuntimeFromId: typeof BundleScheduleOnRuntimeWithId;
  let serializer: (value: unknown) => SerializableRef<unknown>;

  if (
    globalThis.__RUNTIME_KIND === 1 ||
    globalThis._WORKLETS_BUNDLE_MODE_ENABLED
  ) {
    serializer = require('./serializable').createSerializable;
    const { serializableMappingCache } = require('./serializableMappingCache');
    memoize = serializableMappingCache.set.bind(serializableMappingCache);

    runOnRuntimeSyncFromId = require('../runtimes').runOnRuntimeSyncWithId;
    runOnRuntimeAsyncFromId = require('../runtimes').runOnRuntimeAsyncWithId;
    scheduleOnRuntimeFromId = require('../runtimes').scheduleOnRuntimeWithId;
  } else {
    // Serializer can't be inlined here because it might be yet undefined
    // when the unpacker is installed.
    serializer = (value: unknown) => globalThis.__serializer(value);
    memoize = () => {
      // No-op on Worklet Runtimes outside of Bundle Mode.
    };

    const proxy = globalThis.__workletsModuleProxy;
    runOnRuntimeSyncFromId = ((
      hostId: number,
      worklet: WorkletFunction,
      ...args: unknown[]
    ) => {
      const serializedWorklet = serializer(() => {
        'worklet';
        'limit-init-data-hoisting';
        return globalThis.__serializer(worklet(...args));
      });
      return proxy.runOnRuntimeSyncWithId(hostId, serializedWorklet);
    }) as typeof BundleRunOnRuntimeSyncWithId;

    scheduleOnRuntimeFromId = ((
      hostId: number,
      worklet: WorkletFunction,
      ...args: unknown[]
    ) => {
      proxy.scheduleOnRuntimeWithId(
        hostId,
        serializer(() => {
          'worklet';
          'limit-init-data-hoisting';
          return globalThis.__serializer(worklet(...args));
        })
      );
    }) as typeof BundleScheduleOnRuntimeWithId;

    runOnRuntimeAsyncFromId = (() => {
      throw new Error(
        '[Worklets] `Shareable.getAsync` can only be called on the RN Runtime.'
      );
    }) as typeof BundleRunOnRuntimeAsyncWithId;
  }

  function shareableGuestUnpacker<TValue>(
    hostId: number,
    shareableRef: SerializableRef<TValue>,
    guestDecorator?: ShareableGuestDecorator<TValue>
  ): Shareable<TValue> {
    type Host = ShareableHost<TValue>;
    type Guest = ShareableGuest<TValue>;

    let shareableGuest = shareableRef as unknown as Shareable<TValue>;

    shareableGuest.isHost = false;
    shareableGuest.__shareableRef = true;

    const get = () => {
      'worklet';
      'limit-init-data-hoisting';
      return (shareableGuest as Host).value;
    };

    const setWithValue = (value: TValue) => {
      'worklet';
      'limit-init-data-hoisting';
      (shareableGuest as Host).value = value;
    };

    const setWithSetter = (setter: (prev: TValue) => TValue) => {
      'worklet';
      'limit-init-data-hoisting';
      const currentValue = (shareableGuest as Host).value;
      const newValue = setter(currentValue);
      (shareableGuest as Host).value = newValue;
    };

    shareableGuest.getAsync = () => {
      return runOnRuntimeAsyncFromId(hostId, get);
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

    if (guestDecorator) {
      shareableGuest = guestDecorator(shareableGuest as Guest);
    }

    memoize(shareableGuest, shareableRef);
    return shareableGuest;
  }

  globalThis.__shareableGuestUnpacker = shareableGuestUnpacker;
}

export type ShareableGuestUnpacker<TValue = unknown> = (
  hostId: number,
  shareableRef: SerializableRef<TValue>,
  decorateGuest?: ShareableGuestDecorator<TValue>
) => Shareable<TValue>;
