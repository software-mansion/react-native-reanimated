import { TurboModuleRegistry } from 'react-native';
import { createWorkletRuntime, runOnUISync } from 'react-native-worklets';

import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

describe('Test createSerializableOnUI', () => {
  test('createSerializableOnUIString', () => {
    // Arrange & Act
    const stringValue = runOnUISync(() => {
      'worklet';
      return 'test';
    });

    // Assert
    expect(typeof stringValue).toBe('string');
    expect(stringValue).toBe('test');
  });

  test('createSerializableOnUINumber', () => {
    // Arrange & Act
    const numberValue = runOnUISync(() => {
      'worklet';
      return 123;
    });

    // Assert
    expect(typeof numberValue).toBe('number');
    expect(numberValue).toBe(123);
  });

  test('createSerializableOnUITrue', () => {
    // Arrange & Act
    const trueValue = runOnUISync(() => {
      'worklet';
      return true;
    });

    // Assert
    expect(typeof trueValue).toBe('boolean');
    expect(trueValue).toBe(true);
  });

  test('createSerializableOnUIFalse', () => {
    // Arrange & Act
    const falseValue = runOnUISync(() => {
      'worklet';
      return false;
    });

    // Assert
    expect(typeof falseValue).toBe('boolean');
    expect(falseValue).toBe(false);
  });

  test('createSerializableOnUIUndefined', () => {
    // Arrange & Act
    const undefinedValue = runOnUISync(() => {
      'worklet';
      return undefined;
    });

    // Assert
    expect(typeof undefinedValue).toBe('undefined');
    expect(undefinedValue).toBe(undefined);
  });

  test('createSerializableOnUINull', () => {
    // Arrange & Act
    const nullValue = runOnUISync(() => {
      'worklet';
      return null;
    });

    // Assert
    expect(typeof nullValue).toBe('object');
    expect(nullValue).toBe(null);
  });

  test('createSerializableOnUIBigInt', () => {
    // Arrange & Act
    const bigIntValue = runOnUISync(() => {
      'worklet';
      return BigInt(123);
    });

    // Assert
    expect(typeof bigIntValue).toBe('bigint');
    expect(bigIntValue).toBe(BigInt(123));
  });

  test('createSerializableOnUIHostObject', () => {
    // Arrange & Act
    // Prototype of TurboModule is a host object
    const hostObject = Object.getPrototypeOf(
      TurboModuleRegistry.get('Clipboard')
    ) as Record<string, unknown>;
    const hostObjectKeys = Object.keys(hostObject);
    const hostObjectValue = runOnUISync(() => {
      'worklet';
      return hostObject;
    });

    // Assert
    expect(typeof hostObjectValue).toBe('object');
    expect(Object.keys(hostObjectValue).length).toBe(hostObjectKeys.length);
    expect(
      hostObjectKeys.every((key) => hostObjectValue[key] !== undefined)
    ).toBe(true);
  });

  test('createSerializableOnUIArray', () => {
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
      array = 8,
    }

    // Act
    const arrayValue = runOnUISync(() => {
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
        // array
        [1],
      ] as const;
    });

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
    // array
    expect(arrayValue[index.array].length).toBe(1);
    expect(arrayValue[index.array][0]).toBe(1);
  });

  test('createSerializableOnUIError', async () => {
    await expect(() => {
      runOnUISync(() => {
        'worklet';
        return new Error('test');
      });
    }).toThrow(
      'Serializing objects with prototypes different than Object.prototype is not supported. Use `registerCustomSerializable` to register custom serialization logic for such objects.'
    );
  });

  test('createSerializableOnUIInitializer', async () => {
    await expect(() => {
      runOnUISync(() => {
        'worklet';
        return /a/;
      });
    }).toThrow(
      'Serializing objects with prototypes different than Object.prototype is not supported. Use `registerCustomSerializable` to register custom serialization logic for such objects.'
    );
  });

  test('createSerializableOnUIPlainObject', () => {
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
      array = 8,
    }
    const obj = runOnUISync(() => {
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
        [key.array]: [1],
      };
    });

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
    expect(obj[key.array].length).toBe(1);
    expect(obj[key.array][0]).toBe(1);
  });

  test('createSerializableOnUICapturedWorklet', async () => {
    const worklet = () => {
      'worklet';
    };

    await expect(() => {
      runOnUISync(() => {
        'worklet';
        return worklet;
      });
    }).toThrow(
      'Cloning remote functions from Worklet Runtimes isasdasdasd only available in Bundle Mode'
    );
  });

  test('createSerializableOnUINestedWorklet', async () => {
    await expect(() => {
      runOnUISync(() => {
        'worklet';
        return () => {
          'worklet';
          return 1;
        };
      });
    }).toThrow(
      'Serializing worklet functions on Worklet Runtimes is not supported outside of Bundle Mode.'
    );
  });

  test('createSerializableCloneOnUIArrayBuffer', async () => {
    if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      const arrayBuffer = runOnUISync(() => {
        'worklet';
        return new ArrayBuffer(3);
      });

      expect(arrayBuffer instanceof ArrayBuffer).toBe(true);
      expect(arrayBuffer.byteLength).toBe(3);
    } else {
      await expect(() => {
        runOnUISync(() => {
          'worklet';
          return new ArrayBuffer(3);
        });
      }).toThrow(
        'Serializing objects with prototypes different than Object.prototype is not supported. Use `registerCustomSerializable` to register custom serialization logic for such objects.'
      );
    }
  });

  test('createSerializableHostFunction', () => {
    // Arrange & Act
    const hostFunction = runOnUISync(() => {
      'worklet';
      return globalThis.__workletsModuleProxy.createSerializableBoolean;
    }) as (value: boolean) => unknown;

    // Assert
    expect(typeof hostFunction).toBe('function');
    const serializableBoolean = hostFunction(true);
    expect(typeof serializableBoolean).toBe('object');
  });

  test('createSerializableTurboModuleLike', async () => {
    const hostObject = createWorkletRuntime({ name: 'test' });

    if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      const turboModuleLike = runOnUISync(() => {
        'worklet';
        const obj = {};
        Object.setPrototypeOf(obj, hostObject);
        return obj;
      });

      // Assert
      expect(typeof turboModuleLike).toBe('object');
      expect('magicKey' in Object.getPrototypeOf(turboModuleLike)).toBe(true);
    } else {
      await expect(() => {
        runOnUISync(() => {
          'worklet';
          const obj = {};
          Object.setPrototypeOf(obj, hostObject);
          return obj;
        });
      }).toThrow(
        'Serializing objects with prototypes different than Object.prototype is not supported. Use `registerCustomSerializable` to register custom serialization logic for such objects.'
      );
    }
  });

  test('createSerializableOnUICustomPrototype', async () => {
    // Act & Assert
    await expect(() => {
      runOnUISync(() => {
        'worklet';
        class Clazz {
          method() {}
        }

        return new Clazz();
      });
    }).toThrow(
      'Serializing objects with prototypes different than Object.prototype is not supported. Use `registerCustomSerializable` to register custom serialization logic for such objects.'
    );
  });

  test('createSerializableOnUIRemoteNamedFunctionSyncCall', async () => {
    // Arrange
    await expect(() => {
      runOnUISync(() => {
        'worklet';
        return function () {};
      });
    }).toThrow(
      'Cloning remote functions from Worklet Runtimes is only available in Bundle Mode'
    );
  });

  test('createSerializableOnUIRemoteAnonymousFunctionSyncCall', async () => {
    // Act & Assert
    await expect(() => {
      runOnUISync(() => {
        'worklet';
        return function () {};
      });
    }).toThrow(
      'Cloning remote functions from Worklet Runtimes is only available in Bundle Mode'
    );
  });
});
