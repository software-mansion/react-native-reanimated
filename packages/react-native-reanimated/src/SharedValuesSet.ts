'use strict';
import type {
  SharedRegisterer,
  SharedRegistryItem,
  SharedValue,
} from './commonTypes';
import { makeMutable } from './core';

export function makeShareableRegistry(): SharedRegisterer {
  const shareableRegistry = makeMutable<Array<SharedRegistryItem>>([]);
  const data: SharedRegisterer = {
    shareableRegistry,
    registerForUpdates: <T>(
      sharedValue: SharedValue<T>,
      keys: Array<number | string>
    ) => {
      shareableRegistry.modify((registry) => {
        'worklet';
        const index = registry.findIndex(
          (value) => value.sharedValue === sharedValue
        );
        if (index === -1) {
          registry.push({ sharedValue, keys });
        } else {
          registry[index] = { sharedValue, keys };
        }
        return registry;
      });
    },
    unregisterForUpdates: <T>(sharedValue: SharedValue<T>) => {
      shareableRegistry.modify((registry) => {
        'worklet';
        const index = registry.findIndex(
          (value) => value.sharedValue === sharedValue
        );
        if (index !== -1) {
          registry.splice(index, 1);
        }
        return registry;
      });
    },
    has: (sharedValue: SharedValue<any>) => {
      'worklet';
      return shareableRegistry.value.some((value) => {
        return value.sharedValue === sharedValue;
      });
    },
    get: (sharedValue: SharedValue<any>) => {
      'worklet';
      const index = shareableRegistry.value.findIndex(
        (value) => value.sharedValue === sharedValue
      );
      if (index !== -1) {
        return shareableRegistry.value[index];
      }
      return undefined;
    },
  };
  return data;
}
