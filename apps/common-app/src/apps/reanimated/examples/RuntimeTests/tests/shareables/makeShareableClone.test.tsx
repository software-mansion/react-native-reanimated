import React, { useEffect } from 'react';
import { View } from 'react-native';
import { runOnUI, useSharedValue } from 'react-native-reanimated';

import { describe, expect, getRegisteredValue, registerValue, render, test, wait } from '../../ReJest/RuntimeTestsApi';

const RESULT_SHARED_VALUE_REF = 'RESULT_SHARED_VALUE_REF';

const ValueComponent = ({ onRunUIFunction }: { onRunUIFunction: () => boolean }) => {
  const result = useSharedValue<boolean>(false);
  registerValue(RESULT_SHARED_VALUE_REF, result);

  useEffect(() => {
    runOnUI(() => {
      result.value = onRunUIFunction();
    })();
  });

  return <View />;
};

describe('Test makeShareableClone', () => {
  test('makeShareableCloneString', async () => {
    // Arrange
    const testString = 'test';

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [typeof testString === 'string', testString === 'test'];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedResult = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedResult.onUI).toBe(true);
    expect(sharedResult.onJS).toBe(true);
  });

  test('makeShareableCloneNumber', async () => {
    // Arrange
    const testNumber = 123;

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [typeof testNumber === 'number', testNumber === 123];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(true);
    expect(sharedValue.onJS).toBe(true);
  });

  test('makeShareableCloneTrue', async () => {
    // Arrange
    const trueValue = true;

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [typeof trueValue === 'boolean', trueValue === true];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(true);
    expect(sharedValue.onJS).toBe(true);
  });

  test('makeShareableCloneFalse', async () => {
    // Arrange
    const falseValue = false;

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [typeof falseValue === 'boolean', falseValue === false];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(true);
    expect(sharedValue.onJS).toBe(true);
  });

  test('makeShareableCloneUndefined', async () => {
    // Arrange
    const undefinedValue = undefined;

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [typeof undefinedValue === 'undefined', undefinedValue === undefined];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(true);
    expect(sharedValue.onJS).toBe(true);
  });

  test('makeShareableCloneNull', async () => {
    // Arrange
    const nullValue = null;

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [typeof nullValue === 'object', nullValue === null];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(true);
    expect(sharedValue.onJS).toBe(true);
  });

  test('makeShareableCloneBigInt', async () => {
    // Arrange
    const bigIntValue = BigInt(123);

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [typeof bigIntValue === 'bigint', bigIntValue === BigInt(123)];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(true);
    expect(sharedValue.onJS).toBe(true);
  });

  test('makeShareableCloneHostObject', async () => {
    // Arrange
    // @ts-expect-error It's ok
    const hostObjectValue = globalThis.__reanimatedModuleProxy;
    const hostObjectKeys = Object.keys(hostObjectValue);

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [
            typeof hostObjectValue === 'object',
            Object.keys(hostObjectValue).length === hostObjectKeys.length,
            hostObjectKeys.every(key => hostObjectValue[key] !== undefined),
          ];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue<Record<string, any>>(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(true);
    expect(sharedValue.onJS).toBe(true);
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
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const uint8ArrayUI = new Uint8Array(arrayValue[index.arrayBuffer]);
          const checks = [
            // number
            arrayValue[index.number] === 1,
            // boolean
            arrayValue[index.true] === true,
            arrayValue[index.false] === false,
            // null
            arrayValue[index.null] === null,
            // undefined
            arrayValue[index.undefined] === undefined,
            // string
            arrayValue[index.string] === 'a',
            // bigint
            typeof arrayValue[index.bigint] === 'bigint',
            arrayValue[index.bigint] === BigInt(123),
            // object
            typeof arrayValue[index.object] === 'object',
            arrayValue[index.object].a === 1,
            // remote function - not worklet
            typeof arrayValue[index.remoteFunction] === 'function',
            // array
            arrayValue[index.array].length === 1,
            arrayValue[index.array][0] === 1,
            // worklet function
            typeof arrayValue[index.workletFunction] === 'function',
            arrayValue[index.workletFunction]() === 1,
            // initializer - regexp
            arrayValue[index.initializer] instanceof RegExp,
            arrayValue[index.initializer].test('a'),
            // array buffer
            arrayValue[index.arrayBuffer] instanceof ArrayBuffer,
            arrayValue[index.arrayBuffer].byteLength === 3,
            uint8ArrayUI[0] === 1,
            uint8ArrayUI[1] === 2,
            uint8ArrayUI[2] === 3,
          ];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue<any[]>(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(true);
    expect(sharedValue.onJS).toBe(true);
  });

  test('makeShareableCloneError', async () => {
    // Arrange
    const errorValue = new Error('test');

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [errorValue instanceof Error, String(errorValue).includes('test')];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue<Error>(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(true);
    expect(sharedValue.onJS).toBe(true);
  });
});
