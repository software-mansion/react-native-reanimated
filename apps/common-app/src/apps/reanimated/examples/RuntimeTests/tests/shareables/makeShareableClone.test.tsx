import React, { useEffect } from 'react';
import { View } from 'react-native';
import { runOnUI, useSharedValue } from 'react-native-reanimated';

import { describe, expect, getRegisteredValue, registerValue, render, test, wait } from '../../ReJest/RuntimeTestsApi';

const RESULT_SHARED_VALUE_REF = 'RESULT_SHARED_VALUE_REF';

type Result = 'ok' | 'not_ok' | 'error';

const ValueComponent = ({ onRunUIFunction }: { onRunUIFunction: () => boolean }) => {
  const sharedResult = useSharedValue<Result>('not_ok');
  registerValue(RESULT_SHARED_VALUE_REF, sharedResult);

  useEffect(() => {
    try {
      runOnUI(() => {
        'worklet';
        try {
          const result = onRunUIFunction();
          sharedResult.value = result ? 'ok' : 'not_ok';
        } catch (error) {
          sharedResult.value = 'error';
        }
      })();
    } catch (error) {
      sharedResult.value = 'error';
    }
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
    expect(sharedResult.onUI).toBe('ok');
    expect(sharedResult.onJS).toBe('ok');
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
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
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
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
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
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
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
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
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
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
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
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
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
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
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
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
  });

  test('makeShareableCloneSet', async () => {
    // Arrange
    const setValue = new Set([1, '1', true]);

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [
            setValue.has(1),
            setValue.has('1'),
            setValue.has(true),
            setValue.size === 3,
            typeof setValue === 'object',
            setValue instanceof Set,
          ];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
  });

  test('makeShareableCloneMap', async () => {
    // Arrange
    const mapValue = new Map<any, any>([
      [1, 2],
      ['1', '2'],
      [true, false],
    ]);

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [
            mapValue.get(1) === 2,
            mapValue.get('1') === '2',
            mapValue.get(true) === false,
            mapValue.size === 3,
            typeof mapValue === 'object',
            mapValue instanceof Map,
          ];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
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
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
  });

  test('makeShareableInitializer', async () => {
    // Arrange
    const regExpValue = /a/;

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [regExpValue instanceof RegExp, regExpValue.test('a')];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
  });

  test('makeShareablePlainObject', async () => {
    // Arrange
    enum key {
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
    const obj = {
      [key.number]: 1,
      [key.true]: true,
      [key.false]: false,
      [key.null]: null,
      [key.undefined]: undefined,
      [key.string]: 'test',
      [key.bigint]: BigInt(123),
      [key.object]: { f: 4, g: 'test' },
      [key.remoteFunction]: () => {
        return 1;
      },
      [key.array]: [1],
      [key.workletFunction]: () => {
        'worklet';
        return 2;
      },
      [key.initializer]: /test/,
      [key.arrayBuffer]: new ArrayBuffer(3),
    };

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [
            obj[key.number] === 1,
            obj[key.true] === true,
            obj[key.false] === false,
            obj[key.null] === null,
            obj[key.undefined] === undefined,
            obj[key.string] === 'test',
            obj[key.bigint] === BigInt(123),
            obj[key.object].f === 4,
            obj[key.object].g === 'test',
            typeof obj[key.remoteFunction] === 'function',
            __DEV__ === false ||
              ('__remoteFunction' in obj[key.remoteFunction] && !!obj[key.remoteFunction].__remoteFunction),
            obj[key.array].length === 1,
            obj[key.array][0] === 1,
            obj[key.workletFunction]() === 2,
            obj[key.initializer] instanceof RegExp,
            obj[key.initializer].test('test'),
            obj[key.arrayBuffer] instanceof ArrayBuffer,
            obj[key.arrayBuffer].byteLength === 3,
          ];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
  });

  test('makeShareableWorklet', async () => {
    // Arrange
    const workletFunction = () => {
      'worklet';
      return 1;
    };

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [typeof workletFunction === 'function', workletFunction() === 1];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
  });

  test('makeShareableRemoteFunction', async () => {
    // Arrange
    const remoteFunction = () => {
      return 1;
    };

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [
            typeof remoteFunction === 'function',
            __DEV__ === false || ('__remoteFunction' in remoteFunction && !!remoteFunction.__remoteFunction),
          ];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
  });

  test('makeShareableHostFunction', async () => {
    // Arrange
    // @ts-expect-error It's ok
    const hostFunction = globalThis.__workletsModuleProxy.makeShareableBoolean;

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          // make shareable boolean returns a ShareableRef<boolean> which is a host object
          const shareableBoolean = hostFunction(true);
          const checks = [typeof hostFunction === 'function', 'magicKey' in shareableBoolean];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
  });

  test('makeShareableTurboModuleLike', async () => {
    // Arrange
    // @ts-expect-error This global host object isn't exposed in the types.
    const proto = globalThis.__reanimatedModuleProxy;
    const reanimatedModuleKeys = Object.keys(proto);
    const obj = {
      a: 1,
      b: 'test',
    };
    Object.setPrototypeOf(obj, proto);

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [
            obj.a === 1,
            obj.b === 'test',
            reanimatedModuleKeys.every(key => key in Object.getPrototypeOf(obj)),
            'magicKey' in Object.getPrototypeOf(obj) === true,
          ];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
  });

  test('makeShareableArrayBuffer', async () => {
    // Arrange
    const arrayBuffer = new ArrayBuffer(3);
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array[0] = 1;
    uint8Array[1] = 2;
    uint8Array[2] = 3;

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          const checks = [arrayBuffer instanceof ArrayBuffer, arrayBuffer.byteLength === 3];
          return checks.every(Boolean);
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('ok');
    expect(sharedValue.onJS).toBe('ok');
  });

  test('makeShareableCyclicObject', async () => {
    // Arrange
    type RecursiveArray = (number | RecursiveArray)[];
    const cyclicArray: RecursiveArray = [];
    cyclicArray.push(1);
    cyclicArray.push(cyclicArray);

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _test = cyclicArray[1];
          return true;
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('error');
    expect(sharedValue.onJS).toBe('error');
  });

  test('makeShareableInaccessibleObject', async () => {
    // Arrange
    class Inaccessible {
      access() {
        return true;
      }
    }
    const inaccessibleObject = new Inaccessible();

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          return inaccessibleObject.access();
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('error');
    expect(sharedValue.onJS).toBe('error');
  });

  test('makeShareableRemoteNamedFunctionSyncCall', async () => {
    // Arrange
    function foo() {}

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          foo();
          return true;
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('error');
    expect(sharedValue.onJS).toBe('error');
  });

  test('makeShareableRemoteAnonymousFunctionSyncCall', async () => {
    // Arrange
    const foo = () => {};

    // Act
    await render(
      <ValueComponent
        onRunUIFunction={() => {
          'worklet';
          foo();
          return true;
        }}
      />,
    );
    await wait(100);

    // Assert
    const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe('error');
    expect(sharedValue.onJS).toBe('error');
  });
});
