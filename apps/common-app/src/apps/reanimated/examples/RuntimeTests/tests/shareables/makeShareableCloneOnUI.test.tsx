import { TurboModuleRegistry } from 'react-native';
import { executeOnUIRuntimeSync } from 'react-native-reanimated';

import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

describe('Test makeShareableCloneOnUI', () => {
  test('makeShareableCloneOnUIString', () => {
    // Arrange & Act
    const stringValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return 'test';
    })();

    // Assert
    expect(typeof stringValue).toBe('string');
    expect(stringValue).toBe('test');
  });

  test('makeShareableCloneOnUINumber', () => {
    // Arrange & Act
    const numberValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return 123;
    })();

    // Assert
    expect(typeof numberValue).toBe('number');
    expect(numberValue).toBe(123);
  });

  test('makeShareableCloneOnUITrue', () => {
    // Arrange & Act
    const trueValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return true;
    })();

    // Assert
    expect(typeof trueValue).toBe('boolean');
    expect(trueValue).toBe(true);
  });

  test('makeShareableCloneOnUIFalse', () => {
    // Arrange & Act
    const falseValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return false;
    })();

    // Assert
    expect(typeof falseValue).toBe('boolean');
    expect(falseValue).toBe(false);
  });

  test('makeShareableCloneOnUIUndefined', () => {
    // Arrange & Act
    const undefinedValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return undefined;
    })();

    // Assert
    expect(typeof undefinedValue).toBe('undefined');
    expect(undefinedValue).toBe(undefined);
  });

  test('makeShareableCloneOnUINull', () => {
    // Arrange & Act
    const nullValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return null;
    })();

    // Assert
    expect(typeof nullValue).toBe('object');
    expect(nullValue).toBe(null);
  });

  test('makeShareableCloneOnUIBigInt', () => {
    // Arrange & Act
    const bigIntValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return BigInt(123);
    })();

    // Assert
    expect(typeof bigIntValue).toBe('bigint');
    expect(bigIntValue).toBe(BigInt(123));
  });

  test('makeShareableCloneOnUIHostObject', () => {
    // Arrange & Act
    // Prototype of TurboModule is a host object
    const hostObject = Object.getPrototypeOf(TurboModuleRegistry.get('Clipboard'));
    const hostObjectKeys = Object.keys(hostObject);
    const hostObjectValue = executeOnUIRuntimeSync(() => {
      'worklet';
      return hostObject;
    })();

    // Assert
    expect(typeof hostObjectValue).toBe('object');
    expect(Object.keys(hostObjectValue).length).toBe(hostObjectKeys.length);
    expect(hostObjectKeys.every(key => hostObjectValue[key] !== undefined)).toBe(true);
  });

  test('makeShareableCloneOnUIArray', () => {
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
      initializer = 10,
      arrayBuffer = 11,
    }
    const arrayBuffer = new ArrayBuffer(3);
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array[0] = 1;
    uint8Array[1] = 2;
    uint8Array[2] = 3;

    // Act
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
        // initializer - regexp
        /a/,
        // array buffer
        arrayBuffer,
      ];
    })();

    // Assert
    // number
    expect(arrayValue[index.number]).toBe(1);
    // boolean
    expect(arrayValue[index.true]).toBe(true);
    expect(arrayValue[index.false]).toBe(false);
    // null
    expect(arrayValue[index.null]).toBe(null);
    // undefined
    expect(arrayValue[index.undefined]).toBe(undefined);
    // string
    expect(arrayValue[index.string]).toBe('a');
    // bigint
    expect(typeof arrayValue[index.bigint]).toBe('bigint');
    expect(arrayValue[index.bigint]).toBe(BigInt(123));
    // object
    expect(typeof arrayValue[index.object]).toBe('object');
    expect(arrayValue[index.object].a).toBe(1);
    // remote function
    expect(typeof arrayValue[index.remoteFunction]).toBe('object');
    // array
    expect(arrayValue[index.array].length).toBe(1);
    expect(arrayValue[index.array][0]).toBe(1);
    // initializer - regexp
    expect(typeof arrayValue[index.initializer]).toBe('object');
    // array buffer
    expect(typeof arrayValue[index.arrayBuffer]).toBe('object');
  });

  // These types are not supported yet
  // test('makeShareableCloneOnUIError', async () => {
  //   // Arrange
  //   const errorValue = executeOnUIRuntimeSync(() => {
  //     'worklet';
  //     return new Error('test');
  //   })();

  //   // Act
  //   await render(
  //     <ValueComponent
  //       validationFunction={() => {
  //         'worklet';
  //         const checks = [errorValue instanceof Error, String(errorValue).includes('test')];
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

  test('makeShareableCloneOnUIPlainObject', () => {
    // Arrange & Act
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
      initializer = 10,
      arrayBuffer = 11,
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
        [key.initializer]: /test/,
        [key.arrayBuffer]: new ArrayBuffer(3),
      };
    })();

    // Assert
    expect(typeof obj[key.number]).toBe('number');
    expect(obj[key.number]).toBe(1);
    expect(typeof obj[key.true]).toBe('boolean');
    expect(obj[key.true]).toBe(true);
    expect(typeof obj[key.false]).toBe('boolean');
    expect(obj[key.false]).toBe(false);
    expect(typeof obj[key.null]).toBe('object');
    expect(obj[key.null]).toBe(null);
    expect(typeof obj[key.undefined]).toBe('undefined');
    expect(obj[key.undefined]).toBe(undefined);
    expect(typeof obj[key.string]).toBe('string');
    expect(obj[key.string]).toBe('test');
    expect(typeof obj[key.bigint]).toBe('bigint');
    expect(obj[key.bigint]).toBe(BigInt(123));
    expect(typeof obj[key.object]).toBe('object');
    expect(obj[key.object].f).toBe(4);
    expect(obj[key.object].g).toBe('test');
    expect(typeof obj[key.remoteFunction]).toBe('object');
    expect(obj[key.array].length).toBe(1);
    expect(obj[key.array][0]).toBe(1);
    expect(typeof obj[key.initializer]).toBe('object');
  });

  // These types are not supported yet
  // test('makeShareableCloneOnUIWorklet', async () => {
  //   // Arrange
  //   const workletFunction = executeOnUIRuntimeSync(() => {
  //     'worklet';
  //     return () => {
  //       'worklet';
  //       return 1;
  //     };
  //   })();

  //   // Act
  //   await render(
  //     <ValueComponent
  //       validationFunction={() => {
  //         'worklet';
  //         const checks = [typeof workletFunction === 'function', workletFunction() === 1];
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

  // test('makeShareableCloneOnUIArrayBuffer', async () => {
  //   // Arrange
  //   const arrayBuffer = executeOnUIRuntimeSync(() => {
  //     'worklet';
  //     return new ArrayBuffer(3);
  //   })();
  //   const uint8Array = new Uint8Array(arrayBuffer);
  //   uint8Array[0] = 1;
  //   uint8Array[1] = 2;
  //   uint8Array[2] = 3;

  //   // Act
  //   await render(
  //     <ValueComponent
  //       validationFunction={() => {
  //         'worklet';
  //         const checks = [arrayBuffer instanceof ArrayBuffer, arrayBuffer.byteLength === 3];
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

  // test('makeShareableRemoteFunction', async () => {
  //   // Arrange & Act
  //   const remoteFunction = executeOnUIRuntimeSync(() => {
  //     'worklet';
  //     const remoteFunction = () => {
  //       return 1;
  //     };
  //     return remoteFunction;
  //   })();

  //   // Assert
  //   expect(typeof remoteFunction).toBe('function');
  //   expect(__DEV__ === false || ('__remoteFunction' in remoteFunction && !!remoteFunction.__remoteFunction)).toBe(true);
  // });

  // test('makeShareableHostFunction', async () => {
  //   // Arrange & Act
  //   const hostFunction = executeOnUIRuntimeSync(() => {
  //     'worklet';
  //     // @ts-expect-error It's ok
  //     return globalThis.__workletsModuleProxy.makeShareableBoolean;
  //   })();

  //   // Assert
  //   const shareableBoolean = hostFunction(true);
  //   expect(typeof shareableBoolean).toBe('function');
  //   expect('magicKey' in shareableBoolean).toBe(true);
  // });

  // test('makeShareableTurboModuleLike', async () => {
  //   // Arrange & Act
  //   const { obj, reanimatedModuleKeys } = executeOnUIRuntimeSync(() => {
  //     // @ts-expect-error This global host object isn't exposed in the types.
  //     const proto = globalThis.__reanimatedModuleProxy;
  //     const _reanimatedModuleKeys = Object.keys(proto);
  //     const _obj = {
  //       a: 1,
  //       b: 'test',
  //     };
  //     Object.setPrototypeOf(_obj, proto);
  //     return { obj: _obj, reanimatedModuleKeys: _reanimatedModuleKeys };
  //   })();

  //   // Assert
  //   expect(obj.a).toBe(1);
  //   expect(obj.b).toBe('test');
  //   expect(reanimatedModuleKeys.every(key => key in Object.getPrototypeOf(obj))).toBe(true);
  //   expect('magicKey' in Object.getPrototypeOf(obj)).toBe(true);
  // });

  test('makeShareableCloneOnUIInaccessibleObject', async () => {
    // Arrange
    const set = executeOnUIRuntimeSync(() => {
      'worklet';
      return new Set();
    })();

    // Act & Assert
    await expect(() => {
      set.has(42);
    }).toThrow();
  });

  test('makeShareableCloneOnUIRemoteNamedFunctionSyncCall', async () => {
    // Arrange
    const foo = executeOnUIRuntimeSync(() => {
      'worklet';
      return function () {};
    })();

    // Act & Assert
    await expect(() => {
      foo();
    }).toThrow();
  });

  test('makeShareableCloneOnUIRemoteAnonymousFunctionSyncCall', async () => {
    // Arrange
    const foo = executeOnUIRuntimeSync(() => {
      'worklet';
      return function () {};
    })();

    // Act & Assert
    await expect(() => {
      foo();
    }).toThrow();
  });
});
