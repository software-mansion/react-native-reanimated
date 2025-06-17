'use strict';
import type {
  SharedRegisterer,
  SharedRegistry,
  SharedValue,
} from './commonTypes';
import { makeMutable } from './core';

export function makeShareableRegistry(): SharedRegisterer {
  const shareableRegistry = makeMutable<SharedRegistry>(new Map());
  const data: SharedRegisterer = {
    shareableRegistry,
    registerForUpdates: <T>(
      sharedValue: SharedValue<T>,
      keys: Array<number | string>
    ) => {
      shareableRegistry.modify((registry) => {
        'worklet';
        registry.set(sharedValue, keys);
        return registry;
      });
    },
    unregisterForUpdates: <T>(sharedValue: SharedValue<T>) => {
      shareableRegistry.modify((registry) => {
        'worklet';
        registry.delete(sharedValue);
        return registry;
      });
    },
    has: (sharedValue: SharedValue<any>) => {
      'worklet';
      return shareableRegistry.value.has(sharedValue);
    },
    get: (sharedValue: SharedValue<any>) => {
      'worklet';
      return shareableRegistry.value.get(sharedValue);
    },
  };
  return data;
}
