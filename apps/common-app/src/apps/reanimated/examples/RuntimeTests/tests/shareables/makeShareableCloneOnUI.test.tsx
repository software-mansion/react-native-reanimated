import React, { useEffect } from 'react';
import { View } from 'react-native';
import { executeOnUIRuntimeSync, useSharedValue } from 'react-native-reanimated';

import { describe, expect, getRegisteredValue, registerValue, render, test, wait } from '../../ReJest/RuntimeTestsApi';

const RESULT_SHARED_VALUE_REF = 'RESULT_SHARED_VALUE_REF';

type Result = 'ok' | 'not_ok' | 'error';

const ValueComponent = ({ validationFunction }: { validationFunction: () => boolean }) => {
  const sharedResult = useSharedValue<Result>('not_ok');
  registerValue(RESULT_SHARED_VALUE_REF, sharedResult);

  useEffect(() => {
    try {
      try {
        const result = validationFunction();
        sharedResult.value = result ? 'ok' : 'not_ok';
      } catch (error) {
        console.error(error);
        sharedResult.value = 'error';
      }
    } catch (error) {
      console.error(error);
      sharedResult.value = 'error';
    }
  });

  return <View />;
};

describe('Test makeShareableCloneOnUI', () => {
  test('makeShareableCloneOnUIString', async () => {
    // Arrange
    const stringValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return 'test';
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
          'worklet';
          const checks = [typeof stringValue === 'string', stringValue === 'test'];
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

  test('makeShareableCloneOnUINumber', async () => {
    // Arrange
    const testNumber = executeOnUIRuntimeSync(() => {
      'worklet';
      return 123;
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUITrue', async () => {
    // Arrange
    const trueValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return true;
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUIFalse', async () => {
    // Arrange
    const falseValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return false;
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUIUndefined', async () => {
    // Arrange
    const undefinedValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return undefined;
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUINull', async () => {
    // Arrange
    const nullValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return null;
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUIBigInt', async () => {
    // Arrange
    const bigIntValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return BigInt(123);
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUIHostObject', async () => {
    // Arrange
    // @ts-expect-error It's ok
    const hostObjectKeys = Object.keys(globalThis.__workletsModuleProxy);
    const hostObjectValue = executeOnUIRuntimeSync(() => {
      'worklet';
      // @ts-expect-error It's ok
      return globalThis.__workletsModuleProxy;
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUIArray', async () => {
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
      // workletFunction = 10,
      initializer = 10,
      arrayBuffer = 11,
    }
    const arrayBuffer = new ArrayBuffer(3);
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array[0] = 1;
    uint8Array[1] = 2;
    uint8Array[2] = 3;
    const arrayValue: any[] = executeOnUIRuntimeSync(() => {
      'worklet';
      return [
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
        // () => {
        //   'worklet';
        //   return 1;
        // },
        // initializer - regexp
        // /a/,
        // array buffer
        arrayBuffer,
      ];
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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
            // typeof arrayValue[index.workletFunction] === 'function',
            // arrayValue[index.workletFunction]() === 1,
            // initializer - regexp
            // arrayValue[index.initializer] instanceof RegExp,
            // arrayValue[index.initializer].test('a'),
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

  test('makeShareableCloneOnUIError', async () => {
    // Arrange
    const errorValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return new Error('test');
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  // test('makeShareableCloneOnUIInitializer', async () => {
  //   // Arrange
  //   const regExpValue = executeOnUIRuntimeSync(() => {
  //     'worklet';
  //     return /a/;
  //   })();

  //   // Act
  //   await render(
  //     <ValueComponent
  //       validationFunction={() => {
  //         'worklet';
  //         const checks = [regExpValue instanceof RegExp, regExpValue.test('a')];
  //         return checks.every(Boolean);
  //       }}
  //     />,
  //   );
  //   await wait(100);

  //   // Assert
  //   const sharedValue = await getRegisteredValue(RESULT_SHARED_VALUE_REF);
  //   expect(sharedValue.onUI).toBe('ok');
  //   expect(sharedValue.onJS).toBe('ok');
  // });

  test('makeShareableCloneOnUIPlainObject', async () => {
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
      // workletFunction = 10,
      // initializer = 11,
      arrayBuffer = 10,
    }
    const obj = executeOnUIRuntimeSync(() => {
      'worklet';
      return {
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
        // [key.workletFunction]: () => {
        //   'worklet';
        //   return 2;
        // },
        // [key.initializer]: /test/,
        [key.arrayBuffer]: new ArrayBuffer(3),
      };
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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
            // obj[key.workletFunction]() === 2,
            // obj[key.initializer] instanceof RegExp,
            // obj[key.initializer].test('test'),
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

  test('makeShareableCloneOnUIWorklet', async () => {
    // Arrange
    const workletFunction = executeOnUIRuntimeSync(() => {
      'worklet';
      return () => {
        'worklet';
        return 1;
      };
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUIArrayBuffer', async () => {
    // Arrange
    const arrayBuffer = executeOnUIRuntimeSync(() => {
      'worklet';
      return new ArrayBuffer(3);
    })();
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array[0] = 1;
    uint8Array[1] = 2;
    uint8Array[2] = 3;

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUICyclicObject', async () => {
    // Arrange
    type RecursiveArray = (number | RecursiveArray)[];
    const cyclicArray: RecursiveArray = executeOnUIRuntimeSync(() => {
      'worklet';
      return [];
    })();
    cyclicArray.push(1);
    cyclicArray.push(cyclicArray);

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUIInaccessibleObject', async () => {
    // Arrange
    const set = executeOnUIRuntimeSync(() => {
      'worklet';
      return new Set();
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
          'worklet';
          set.has(42);
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

  test('makeShareableCloneOnUIRemoteNamedFunctionSyncCall', async () => {
    // Arrange
    const foo = executeOnUIRuntimeSync(() => {
      'worklet';
      return function () {};
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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

  test('makeShareableCloneOnUIRemoteAnonymousFunctionSyncCall', async () => {
    // Arrange
    const foo = executeOnUIRuntimeSync(() => {
      'worklet';
      return function () {};
    })();

    // Act
    await render(
      <ValueComponent
        validationFunction={() => {
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
