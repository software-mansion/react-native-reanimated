/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
  scheduleOnUI,
} from 'react-native-worklets';

type IGlobalConstructorCarrier = {
  __isCustomObject: true;
  constructor: any;
};

function GlobalConstructorCarrierFactory(constructor: any) {
  'worklet';
  // Workaround because `new` keyword is reserved for Worklet Classes...
  const GlobalConstructorCarrier = function GlobalConstructorCarrier(
    this: IGlobalConstructorCarrier,
    constructor: any,
  ) {
    this.__isCustomObject = true;
    this.constructor = constructor;
  } as unknown as {
    new (constructor: any): IGlobalConstructorCarrier;
  };

  return new GlobalConstructorCarrier(constructor);
}

const determine = (value: object): value is IGlobalConstructorCarrier => {
  'worklet';
  return (value as Record<string, unknown>).__isCustomObject === true;
};

const pack = (value: IGlobalConstructorCarrier) => {
  'worklet';
  const constructorName = value.constructor.name;
  return { constructorName };
};

const unpack = (value: { constructorName: string }) => {
  'worklet';
  return GlobalConstructorCarrierFactory((globalThis as any)[value.constructorName]);
};

describe('Test CustomSerializables', () => {
  const workletRuntime = createWorkletRuntime({ name: 'test' });

  test('registers without failure', () => {
    // Arrange
    let error = false;

    // Act
    try {
      registerCustomSerializable({
        name: 'registration test',
        determine,
        pack,
        unpack,
      });
    } catch {
      error = true;
    }

    // Assert
    expect(error).toBe(false);
  });

  test('serializes custom object on RN Runtime', () => {
    // Arrange
    const testObject = GlobalConstructorCarrierFactory(Array);
    let serialized: object | null = null;

    // Act
    serialized = createSerializable(testObject);

    // Assert
    expect(serialized).not.toBe(null);
  });

  test('serializes custom object on RN Runtime and deserializes on UI', () => {
    // Arrange
    const testObject = GlobalConstructorCarrierFactory(Array);

    // Act
    const pass = runOnUISync(() => {
      'worklet';
      return testObject.constructor === Array;
    });

    expect(pass).toBe(true);
  });

  test('serializes custom object on the UI Runtime and deserializes on RN', () => {
    // Arrange

    const testObject = runOnUISync(() => {
      'worklet';
      return GlobalConstructorCarrierFactory(Array);
    });

    // Act
    const pass = testObject.constructor === Array;

    // Assert
    expect(pass).toBe(true);
  });

  test('passes object back and forth between RN and UI runtimes', () => {
    // Arrange

    const testObject = GlobalConstructorCarrierFactory(Array);

    // Act
    const testObject2 = runOnUISync(() => {
      'worklet';
      return testObject;
    });

    const pass = testObject2.constructor === Array;

    // Assert
    expect(pass).toBe(true);
  });

  test('serializes custom object on RN Runtime and deserializes on custom Worklet Runtime', async () => {
    // Arrange
    const testObject = GlobalConstructorCarrierFactory(Array);
    const pass = createSynchronizable(false);
    const notificationName = 'done';

    // Act
    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      pass.setBlocking(testObject.constructor === Array);
      notify(notificationName);
    });

    await waitForNotification(notificationName);

    // Assert
    expect(pass.getBlocking()).toBe(true);
  });

  test('serializes custom object on custom Worklet Runtime and deserializes on RN', async () => {
    // Arrange
    let testObject: IGlobalConstructorCarrier | null = null;
    const notificationName = 'done';

    const setReturnValue = (value: any) => (testObject = value);

    // Act
    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      const testObject = GlobalConstructorCarrierFactory(Array);
      scheduleOnRN(setReturnValue, testObject);
      notify(notificationName);
    });

    await waitForNotification(notificationName);

    const pass = testObject!.constructor === Array;

    // Assert
    expect(pass).toBe(true);
  });

  test('propagates new registrations to all runtimes', async () => {
    // Arrange
    const preRuntime = workletRuntime;

    type IGlobalConstructorCarrier2 = {
      __isCustomObject2: true;
      constructor: any;
    };

    function GlobalConstructorCarrierFactory2(constructor: any) {
      'worklet';
      // Workaround because `new` keyword is reserved for Worklet Classes...
      const GlobalConstructorCarrier2 = function GlobalConstructorCarrier2(
        this: IGlobalConstructorCarrier2,
        constructor: any,
      ) {
        this.__isCustomObject2 = true;
        this.constructor = constructor;
      } as unknown as {
        new (constructor: any): IGlobalConstructorCarrier2;
      };

      return new GlobalConstructorCarrier2(constructor);
    }

    const determine2 = (value: object): value is IGlobalConstructorCarrier2 => {
      'worklet';
      return (value as Record<string, unknown>).__isCustomObject2 === true;
    };

    registerCustomSerializable({
      name: 'propagation test',
      determine: determine2 as unknown as typeof determine,
      pack,
      unpack,
    });

    const postRuntime = createWorkletRuntime();

    const uiNotificationName = 'ui_done';
    const preRuntimeNotificationName = 'pre_done';
    const postRuntimeNotificationName = 'post_done';

    let uiPass = false;
    const setUiPass = (value: boolean) => {
      uiPass = value;
    };
    let preRuntimePass = false;
    const setPreRuntimePass = (value: boolean) => {
      preRuntimePass = value;
    };
    let postRuntimePass = false;
    const setPostRuntimePass = (value: boolean) => {
      postRuntimePass = value;
    };

    // Act
    scheduleOnUI(() => {
      'worklet';
      const testObject = GlobalConstructorCarrierFactory2(Array);
      const pass = testObject.constructor === Array;
      scheduleOnRN(setUiPass, pass);
      notify(uiNotificationName);
    });

    scheduleOnRuntime(preRuntime, () => {
      'worklet';
      const testObject = GlobalConstructorCarrierFactory2(Array);
      const pass = testObject.constructor === Array;
      scheduleOnRN(setPreRuntimePass, pass);
      notify(preRuntimeNotificationName);
    });

    scheduleOnRuntime(postRuntime, () => {
      'worklet';
      const testObject = GlobalConstructorCarrierFactory2(Array);
      const pass = testObject.constructor === Array;
      scheduleOnRN(setPostRuntimePass, pass);
      notify(postRuntimeNotificationName);
    });

    await waitForNotification(uiNotificationName);
    await waitForNotification(preRuntimeNotificationName);
    await waitForNotification(postRuntimeNotificationName);

    // Assert
    expect(uiPass).toBe(true);
    expect(preRuntimePass).toBe(true);
    expect(postRuntimePass).toBe(true);
  });
});
