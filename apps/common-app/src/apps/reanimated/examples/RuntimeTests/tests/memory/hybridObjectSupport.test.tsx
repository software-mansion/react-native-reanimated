/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, notify, test, waitForNotification } from '../../ReJest/RuntimeTestsApi';
import {
  createSerializable,
  createSynchronizable,
  createWorkletRuntime,
  registerCustomSerializable,
  runOnUISync,
  scheduleOnRN,
  scheduleOnRuntime,
  serializableMappingCache,
} from 'react-native-worklets';

import { createMMKV, type MMKV } from 'react-native-mmkv';
import { type HybridObject, NitroModules } from 'react-native-nitro-modules';
import type { BoxedHybridObject } from 'react-native-nitro-modules/lib/typescript/BoxedHybridObject';

const boxedNitroModules = NitroModules.box(NitroModules);

const NitroModulesHandle = {
  __init() {
    'worklet';
    return boxedNitroModules.unbox();
  },
};

const serializedNitroModulesHandle = createSerializable(NitroModulesHandle);
serializableMappingCache.set(NitroModules, serializedNitroModulesHandle);

const determine = (value: object) => {
  'worklet';
  return NitroModules.isHybridObject(value);
};

const pack = (value: HybridObject<never>) => {
  'worklet';
  return NitroModules.box(value);
};

const unpack = (value: BoxedHybridObject<HybridObject<never>>) => {
  'worklet';
  return value.unbox();
};

registerCustomSerializable({
  name: 'nitro::HybridObject',
  determine,
  pack,
  unpack,
});

let storageId = 0;
let storeValue = 1;

const getTestData = () => {
  return {
    storage: createMMKV({
      id: (storageId++).toString(),
    }),
    testValue: storeValue,
    testKey: (storeValue++).toString(),
  };
};

describe('Test HybridObject Support', () => {
  test('passes HybridObjects from RN runtime to UI runtime', () => {
    // Arrange
    const { storage, testValue, testKey } = getTestData();
    storage.set(testKey, testValue);

    // Act
    const readValue = runOnUISync(() => {
      'worklet';
      return storage.getNumber(testKey);
    });

    // Assert
    expect(readValue).toBe(testValue);
  });

  test('passes HybridObjects from UI runtime to RN runtime', () => {
    // Arrange
    const { storage, testValue, testKey } = getTestData();

    // Act
    const returnedStorage = runOnUISync(() => {
      'worklet';
      storage.set(testKey, testValue);
      return storage;
    });

    // Assert
    expect(returnedStorage.getNumber(testKey)).toBe(testValue);
  });

  test('passes HybridObjects from RN runtime to Worker runtime', async () => {
    // Arrange
    const runtime = createWorkletRuntime();
    const pass = createSynchronizable<undefined | number>(undefined);
    const notificationName = 'done';
    const { storage, testValue, testKey } = getTestData();
    storage.set(testKey, testValue);

    // Act
    scheduleOnRuntime(runtime, () => {
      'worklet';
      pass.setBlocking(storage.getNumber(testKey));
      notify(notificationName);
    });

    await waitForNotification(notificationName);

    // Assert
    expect(pass.getBlocking()).toBe(testValue);
  });

  test('passes HybridObjects from Worker Runtime to RN runtime', async () => {
    // Arrange
    const runtime = createWorkletRuntime();
    const notificationName = 'done';
    let returnedStorage: MMKV | null = null;
    const { storage, testValue, testKey } = getTestData();
    storage.set(testKey, testValue);

    const setReturnValue = (value: any) => (returnedStorage = value);

    // Act
    scheduleOnRuntime(runtime, () => {
      'worklet';
      scheduleOnRN(setReturnValue, storage);
      notify(notificationName);
    });

    await waitForNotification(notificationName);

    // Assert
    expect(returnedStorage!.getNumber(testKey)).toBe(testValue);
  });
});
