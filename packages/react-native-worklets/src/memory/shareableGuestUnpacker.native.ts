/* eslint-disable n/no-missing-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

import type {
  runOnRuntimeAsyncWithId as BundleRunOnRuntimeAsyncWithId,
  runOnRuntimeSyncWithId as BundleRunOnRuntimeSyncWithId,
  scheduleOnRuntimeWithId as BundleScheduleOnRuntimeWithId,
} from '../runtimes';
import type {
  SerializableRef,
  Shareable,
  ShareableGuest,
  ShareableGuestDecorator,
  ShareableHost,
} from './types';

export function installShareableGuestUnpacker() {
  'worklet';
  const { serializableMappingCache } = require('./serializableMappingCache');
  const memoize: (
    unpacked: Shareable<unknown>,
    serialized: SerializableRef<unknown>
  ) => void = serializableMappingCache.set.bind(serializableMappingCache);

  const runOnRuntimeSyncFromId: typeof BundleRunOnRuntimeSyncWithId =
    require('../runtimes').runOnRuntimeSyncWithId;
  const runOnRuntimeAsyncFromId: typeof BundleRunOnRuntimeAsyncWithId =
    require('../runtimes').runOnRuntimeAsyncWithId;
  const scheduleOnRuntimeFromId: typeof BundleScheduleOnRuntimeWithId =
    require('../runtimes').scheduleOnRuntimeWithId;

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
