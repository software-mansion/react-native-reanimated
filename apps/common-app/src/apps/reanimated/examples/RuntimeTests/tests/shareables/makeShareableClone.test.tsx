import React, { useEffect } from 'react';
import { View } from 'react-native';
import { runOnUI, useSharedValue } from 'react-native-reanimated';

import { describe, expect, getRegisteredValue, registerValue, render, test, wait } from '../../ReJest/RuntimeTestsApi';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

const ValueComponent = ({ value }: { value: any }) => {
  const output = useSharedValue<any>(null);
  registerValue(SHARED_VALUE_REF, output);

  useEffect(() => {
    runOnUI(() => {
      output.value = value;
    })();
  });

  return <View />;
};

describe('Test makeShareableClone', () => {
  test('makeShareableCloneString', async () => {
    // Arrange
    const testString = 'test';

    // Act
    await render(<ValueComponent value={testString} />);
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(testString);
    expect(sharedValue.onJS).toBe(testString);
  });

  test('makeShareableCloneNumber', async () => {
    // Arrange
    const testNumber = 123;

    // Act
    await render(<ValueComponent value={testNumber} />);
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(testNumber);
    expect(sharedValue.onJS).toBe(testNumber);
  });

  test('makeShareableCloneTrue', async () => {
    // Arrange
    const trueValue = true;

    // Act
    await render(<ValueComponent value={trueValue} />);
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(trueValue);
    expect(sharedValue.onJS).toBe(trueValue);
  });

  test('makeShareableCloneFalse', async () => {
    // Arrange
    const falseValue = false;

    // Act
    await render(<ValueComponent value={falseValue} />);
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(falseValue);
    expect(sharedValue.onJS).toBe(falseValue);
  });

  test('makeShareableCloneUndefined', async () => {
    // Arrange
    const undefinedValue = undefined;

    // Act
    await render(<ValueComponent value={undefinedValue} />);
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(undefinedValue);
    expect(sharedValue.onJS).toBe(undefinedValue);
  });

  test('makeShareableCloneNull', async () => {
    // Arrange
    const nullValue = null;

    // Act
    await render(<ValueComponent value={nullValue} />);
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(nullValue);
    expect(sharedValue.onJS).toBe(nullValue);
  });

  test('makeShareableCloneBigInt', async () => {
    // Arrange
    const bigIntValue = BigInt(123);

    // Act
    await render(<ValueComponent value={bigIntValue} />);
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(bigIntValue);
    expect(sharedValue.onJS).toBe(bigIntValue);
  });

  test('makeShareableCloneHostObject', async () => {
    // Arrange
    // @ts-expect-error It's ok
    const hostObjectValue = globalThis.__reanimatedModuleProxy;
    const hostObjectKeys = Object.keys(hostObjectValue);

    // Act
    await render(<ValueComponent value={hostObjectValue} />);
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue<Record<string, any>>(SHARED_VALUE_REF);
    expect(Object.keys(sharedValue.onUI).length).toBe(hostObjectKeys.length);
    for (const key of hostObjectKeys) {
      expect(sharedValue.onUI[key]).not.toBe(undefined);
    }

    expect(Object.keys(sharedValue.onJS).length).toBe(hostObjectKeys.length);
    for (const key of hostObjectKeys) {
      expect(sharedValue.onJS[key]).not.toBe(undefined);
    }
  });

  test('makeShareableCloneArray', async () => {
    // Arrange
    enum index {
      number = 0,
      true = 1,
      false = 2,
      null = 3,
      undefined = 4,
      string = 5,
      bigint = 6,
      object = 7,
      remoteFunction = 8,
      array = 9,
      workletFunction = 10,
      initializer = 11,
      arrayBuffer = 12,
    }
    const arrayBuffer = new ArrayBuffer(3);
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array[0] = 1;
    uint8Array[1] = 2;
    uint8Array[2] = 3;
    const arrayValue: any[] = [
      // number
      1,
      // boolean
      true,
      false,
      // null
      null,
      // undefined
      undefined,
      // string
      'a',
      // bigint
      BigInt(123),
      // object
      { a: 1 },
      // remote function - not a worklet
      () => {
        return 1;
      },
      // array
      [1],
      // worklet function
      () => {
        'worklet';
        return 1;
      },
      // initializer - regexp
      /a/,
      // array buffer
      arrayBuffer,
    ];

    // Act
    await render(<ValueComponent value={arrayValue} />);
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue<any[]>(SHARED_VALUE_REF);

    // Number
    expect(sharedValue.onUI[index.number]).toBe(1);
    expect(sharedValue.onJS[index.number]).toBe(1);

    // Boolean
    expect(sharedValue.onUI[index.true]).toBe(true);
    expect(sharedValue.onJS[index.true]).toBe(true);
    expect(sharedValue.onUI[index.false]).toBe(false);
    expect(sharedValue.onJS[index.false]).toBe(false);

    // Null and Undefined
    expect(sharedValue.onUI[index.null]).toBe(null);
    expect(sharedValue.onJS[index.null]).toBe(null);
    expect(sharedValue.onUI[index.undefined]).toBe(undefined);
    expect(sharedValue.onJS[index.undefined]).toBe(undefined);

    // String
    expect(sharedValue.onUI[index.string]).toBe('a');
    expect(sharedValue.onJS[index.string]).toBe('a');

    // BigInt
    expect(typeof sharedValue.onUI[index.bigint]).toBe('bigint');
    expect(sharedValue.onUI[index.bigint]).toBe(BigInt(123));
    expect(typeof sharedValue.onJS[index.bigint]).toBe('bigint');
    expect(sharedValue.onJS[index.bigint]).toBe(BigInt(123));

    // Object
    expect(typeof sharedValue.onUI[index.object]).toBe('object');
    expect(sharedValue.onUI[index.object].a).toBe(1);
    expect(typeof sharedValue.onJS[index.object]).toBe('object');
    expect(sharedValue.onJS[index.object].a).toBe(1);

    // Remote function
    expect(typeof sharedValue.onUI[index.remoteFunction]).toBe('function');
    if (__DEV__ === false) {
      expect('__remoteFunction' in sharedValue.onUI[index.remoteFunction]).toBe(true);
      expect(!!sharedValue.onUI[index.remoteFunction].__remoteFunction).toBe(true);
    }
    expect(typeof sharedValue.onJS[index.remoteFunction]).toBe('function');

    // Array
    expect(sharedValue.onUI[index.array].length).toBe(1);
    expect(sharedValue.onUI[index.array][0]).toBe(1);
    expect(sharedValue.onJS[index.array].length).toBe(1);
    expect(sharedValue.onJS[index.array][0]).toBe(1);

    // Worklet function
    expect(typeof sharedValue.onUI[index.workletFunction]).toBe('object');
    expect(typeof sharedValue.onJS[index.workletFunction]).toBe('object');

    // Initializer (RegExp)
    expect(sharedValue.onUI[index.initializer] instanceof Object).toBe(true);
    // expect(sharedValue.onUI[index.initializer].test('a')).toBe(true);
    expect(sharedValue.onJS[index.initializer] instanceof Object).toBe(true);
    // expect(sharedValue.onJS[index.initializer].test('a')).toBe(true);

    // ArrayBufferr
    expect(typeof sharedValue.onUI[index.arrayBuffer]).toBe('object');
    // expect(sharedValue.onUI[index.arrayBuffer].byteLength).toBe(3);
    // const uint8ArrayUI = new Uint8Array(sharedValue.onUI[index.arrayBuffer]);
    // expect(uint8ArrayUI[0]).toBe(1);
    // expect(uint8ArrayUI[1]).toBe(2);
    // expect(uint8ArrayUI[2]).toBe(3);
    // expect(sharedValue.onJS[index.arrayBuffer] instanceof ArrayBuffer).toBe(true);
    // expect(sharedValue.onJS[index.arrayBuffer].byteLength).toBe(3);
    // const uint8ArrayJS = new Uint8Array(sharedValue.onJS[index.arrayBuffer]);
    // expect(uint8ArrayJS[0]).toBe(1);
    // expect(uint8ArrayJS[1]).toBe(2);
    // expect(uint8ArrayJS[2]).toBe(3);
  });

  test('makeShareableCloneError', async () => {
    // Arrange
    const errorValue = new Error('test');

    // Act
    await render(<ValueComponent value={errorValue} />);
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue<Error>(SHARED_VALUE_REF);
    expect(String(sharedValue.onUI).includes('test')).toBe(true);
    expect(String(sharedValue.onJS).includes('test')).toBe(true);
  });
});
