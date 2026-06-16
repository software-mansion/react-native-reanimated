/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TurboModuleRegistry } from 'react-native';
import {
  createSerializable,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  getWorkletRuntimeFromPool,
  notify,
  test,
  waitForNotification,
} from '../../ReJest/RuntimeTestsApi';

describe('Test createSerializable', () => {
  const PASS_NOTIFICATION = 'PASS';
  const FAIL_NOTIFICATION = 'FAIL';
  let result = false;
  let errorMessage = '';

  const workletRuntime = getWorkletRuntimeFromPool('test');

  const targets = [
    {
      scheduleOnTarget: (worklet: () => void) => {
        scheduleOnUI(worklet);
      },
      targetRuntime: 'UI',
      runtimeName: 'UI',
    },
    {
      scheduleOnTarget: (worklet: () => void) => {
        'worklet';
        scheduleOnRuntime(workletRuntime, worklet);
      },
      targetRuntime: 'Worker',
      runtimeName: 'test',
    },
  ];

  const callbackPass = (ok: boolean) => {
    result = ok;
    notify(PASS_NOTIFICATION);
  };

  const callbackFail = (message: string) => {
    errorMessage = message;
    notify(FAIL_NOTIFICATION);
  };

  targets.forEach(({ targetRuntime, scheduleOnTarget, runtimeName }) => {
    describe(`on ${targetRuntime} Runtime`, () => {
      beforeEach(() => {
        result = false;
        errorMessage = '';
      });

      test('createSerializableString', async () => {
        const testString = 'test';
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typeof testString === 'string',
            testString === 'test',
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableNumber', async () => {
        const testNumber = 123;
        scheduleOnTarget(() => {
          'worklet';
          const checks = [typeof testNumber === 'number', testNumber === 123];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableTrue', async () => {
        const trueValue = true;
        scheduleOnTarget(() => {
          'worklet';
          const checks = [typeof trueValue === 'boolean', trueValue === true];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableFalse', async () => {
        const falseValue = false;
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typeof falseValue === 'boolean',
            falseValue === false,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableUndefined', async () => {
        const undefinedValue = undefined;
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typeof undefinedValue === 'undefined',
            undefinedValue === undefined,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableNull', async () => {
        const nullValue = null;
        scheduleOnTarget(() => {
          'worklet';
          const checks = [typeof nullValue === 'object', nullValue === null];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableBigInt fitting in int64', async () => {
        const bigIntValue = BigInt(123);
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typeof bigIntValue === 'bigint',
            bigIntValue === BigInt(123),
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableBigInt too big for uint64', async () => {
        const maxInt64 = BigInt('0x7FFFFFFFFFFFFFFF');
        const bigIntValue = maxInt64 * maxInt64;
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typeof bigIntValue === 'bigint',
            bigIntValue === maxInt64 * maxInt64,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableSymbol', async () => {
        const symbolValue: unknown = Symbol('test');
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typeof symbolValue === 'string',
            symbolValue === 'Symbol(test)',
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableHostObject', async () => {
        const hostObjectValue = globalThis.__reanimatedModuleProxy;
        const hostObjectKeys = Object.keys(hostObjectValue);
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typeof hostObjectValue === 'object',
            Object.keys(hostObjectValue).length === hostObjectKeys.length,
            hostObjectKeys.every((key) => hostObjectValue[key] !== undefined),
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableArray', async () => {
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

        scheduleOnTarget(() => {
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
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableTypedArray', async () => {
        const typedArrayValue = new Uint8Array(4);
        typedArrayValue[0] = 1;
        typedArrayValue[1] = 2;
        typedArrayValue[2] = 3;
        typedArrayValue[3] = 4;
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typedArrayValue instanceof Uint8Array,
            typedArrayValue.length === 4,
            typedArrayValue[0] === 1,
            typedArrayValue[1] === 2,
            typedArrayValue[2] === 3,
            typedArrayValue[3] === 4,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableInt32Array', async () => {
        const typedArrayValue = new Int32Array(2);
        typedArrayValue[0] = -1;
        typedArrayValue[1] = 42;
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typedArrayValue instanceof Int32Array,
            typedArrayValue.length === 2,
            typedArrayValue[0] === -1,
            typedArrayValue[1] === 42,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableTypedArraySubrange', async () => {
        const buf = new ArrayBuffer(16);
        const full = new Uint16Array(buf);
        for (let i = 0; i < full.length; i++) {
          full[i] = i + 1;
        }
        const typedArrayValue = new Uint16Array(buf, 4, 2);
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typedArrayValue instanceof Uint16Array,
            typedArrayValue.length === 2,
            typedArrayValue.byteOffset === 4,
            typedArrayValue.buffer.byteLength === 16,
            typedArrayValue[0] === 3,
            typedArrayValue[1] === 4,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableDataView', async () => {
        const buf = new ArrayBuffer(4);
        const dataViewValue = new DataView(buf);
        dataViewValue.setUint8(0, 0xab);
        dataViewValue.setUint8(1, 0xcd);
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            dataViewValue instanceof DataView,
            dataViewValue.byteLength === 4,
            dataViewValue.getUint8(0) === 0xab,
            dataViewValue.getUint8(1) === 0xcd,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableSet', async () => {
        const setValue = new Set([1, '1', true]);
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            setValue.has(1),
            setValue.has('1'),
            setValue.has(true),
            setValue.size === 3,
            typeof setValue === 'object',
            setValue instanceof Set,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableMap', async () => {
        const mapValue = new Map<any, any>([
          [1, 2],
          ['1', '2'],
          [true, false],
        ]);
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            mapValue.get(1) === 2,
            mapValue.get('1') === '2',
            mapValue.get(true) === false,
            mapValue.size === 3,
            typeof mapValue === 'object',
            mapValue instanceof Map,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableError', async () => {
        const errorValue = new Error('test');
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            errorValue instanceof Error,
            String(errorValue).includes('test'),
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableInitializer', async () => {
        const regExpValue = /a/;
        scheduleOnTarget(() => {
          'worklet';
          const checks = [regExpValue instanceof RegExp, regExpValue.test('a')];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializablePlainObject', async () => {
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

        scheduleOnTarget(() => {
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
              ('__remoteFunction' in obj[key.remoteFunction] &&
                !!obj[key.remoteFunction].__remoteFunction),
            obj[key.array].length === 1,
            obj[key.array][0] === 1,
            obj[key.workletFunction]() === 2,
            obj[key.initializer] instanceof RegExp,
            obj[key.initializer].test('test'),
            obj[key.arrayBuffer] instanceof ArrayBuffer,
            obj[key.arrayBuffer].byteLength === 3,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableWorklet', async () => {
        const workletFunction = () => {
          'worklet';
          return 1;
        };
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typeof workletFunction === 'function',
            workletFunction() === 1,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableRemoteFunction', async () => {
        const remoteFunction = () => {
          return 1;
        };
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            typeof remoteFunction === 'function',
            __DEV__ === false ||
              ('__remoteFunction' in remoteFunction &&
                !!remoteFunction.__remoteFunction),
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableHostFunction', async () => {
        const hostFunction = globalThis.__workletsModuleProxy
          .createSerializableBoolean as any;
        scheduleOnTarget(() => {
          'worklet';
          // createSerializableBoolean returns a SerializableRef<boolean> which is a serializable ref
          const serializableBoolean = hostFunction(true);
          const checks = [
            typeof hostFunction === 'function',
            serializableBoolean.__serializableRef,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableTurboModuleLike', async () => {
        const clipboard = TurboModuleRegistry.getEnforcing('Clipboard');

        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            Object.getOwnPropertyNames(clipboard).includes('magicKey') ===
              false,
            'magicKey' in Object.getPrototypeOf(clipboard) === true,
            Object.keys(clipboard).every(
              (key) => key in Object.getPrototypeOf(clipboard)
            ),
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableArrayBuffer', async () => {
        const arrayBuffer = new ArrayBuffer(3);
        const uint8Array = new Uint8Array(arrayBuffer);
        uint8Array[0] = 1;
        uint8Array[1] = 2;
        uint8Array[2] = 3;
        scheduleOnTarget(() => {
          'worklet';
          const checks = [
            arrayBuffer instanceof ArrayBuffer,
            arrayBuffer.byteLength === 3,
          ];
          scheduleOnRN(callbackPass, checks.every(Boolean));
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableCyclicObject', async () => {
        type RecursiveArray = (number | RecursiveArray)[];
        const cyclicArray: RecursiveArray = [];
        cyclicArray.push(1);
        cyclicArray.push(cyclicArray);

        await expect(() => {
          createSerializable(cyclicArray);
        }).toThrow('Trying to convert a cyclic object');
      });

      test('createSerializableInaccessibleObject', async () => {
        class Inaccessible {
          access() {
            return true;
          }
        }
        const inaccessibleObject = new Inaccessible();

        await expect(() => {
          createSerializable(inaccessibleObject);
        }).toThrow('Cannot copy value of type `Inaccessible`.');
      });

      test('createSerializableRemoteNamedFunctionSyncCall', async () => {
        function fooFunction() {}
        scheduleOnTarget(() => {
          'worklet';
          try {
            fooFunction();
            scheduleOnRN(callbackPass, false);
          } catch (error) {
            scheduleOnRN(
              callbackFail,
              error instanceof Error ? error.message : String(error)
            );
          }
        });
        await waitForNotification(FAIL_NOTIFICATION);
        expect(errorMessage).toInclude(
          'Tried to synchronously call a Remote Function.'
        );
        expect(errorMessage).toInclude(__DEV__ ? 'fooFunction' : 'anonymous');
        expect(errorMessage).toInclude('on the ' + runtimeName + ' Runtime');
      });

      test('createSerializableRemoteAnonymousFunctionSyncCall', async () => {
        const foo = [() => {}];
        scheduleOnTarget(() => {
          'worklet';
          try {
            foo[0]();
            scheduleOnRN(callbackPass, false);
          } catch (error) {
            scheduleOnRN(
              callbackFail,
              error instanceof Error ? error.message : String(error)
            );
          }
        });
        await waitForNotification(FAIL_NOTIFICATION);
        expect(errorMessage).toInclude(
          'Tried to synchronously call a Remote Function.'
        );
        expect(errorMessage).toInclude('anonymous');
        expect(errorMessage).toInclude('on the ' + runtimeName + ' Runtime');
      });
    });
  });
});

if (__DEV__) {
  describe('createSerializable for unsupported types', () => {
    test('throws when trying to serialize a Promise', async () => {
      const promise = Promise.resolve();
      await expect(() => {
        createSerializable(promise);
      }).toThrow('Cannot copy value of type `Promise`');
    });

    test('throws when trying to serialize a Proxy', async () => {
      const proxy = new Proxy({ a: 1 }, { getPrototypeOf: () => null });
      await expect(() => {
        createSerializable(proxy);
      }).toThrow('Cannot copy value of type');
    });
  });

  describe('Test serializable freezing', () => {
    const FREEZE_WARNING = 'Tried to modify key';

    test('warns when modifying converted array', async () => {
      const obj = [1, 2, 3];
      createSerializable(obj);
      await expect(() => {
        obj[0] = 2;
      }).toThrow(FREEZE_WARNING);
    });

    test('warns when modifying converted remote function', async () => {
      const obj = () => {};
      obj.prop = 1;
      createSerializable(obj);
      await expect(() => {
        obj.prop = 2;
      }).toThrow(FREEZE_WARNING);
    });

    test('does not warn when modifying converted host object', async () => {
      const obj = TurboModuleRegistry.get('Clipboard');
      if (!obj) {
        return;
      }
      createSerializable(obj);
      await expect(() => {
        (obj as any).prop = 2;
      }).not.toThrow();
    });

    test('warns when modifying converted plain object', async () => {
      const obj = { prop: 1 };
      createSerializable(obj);
      await expect(() => {
        obj.prop = 2;
      }).toThrow(FREEZE_WARNING);
    });

    test('does not warn when modifying converted RegExp literal', async () => {
      const obj = /a/;
      createSerializable(obj);
      await expect(() => {
        (obj as any).prop = 2;
      }).not.toThrow();
    });

    test('does not warn when modifying converted RegExp instance', async () => {
      // eslint-disable-next-line prefer-regex-literals
      const obj = new RegExp('a');
      createSerializable(obj);
      await expect(() => {
        (obj as any).prop = 2;
      }).not.toThrow();
    });

    test('does not warn when modifying converted ArrayBuffer', async () => {
      const obj = new ArrayBuffer(8);
      createSerializable(obj);
      await expect(() => {
        (obj as any).prop = 2;
      }).not.toThrow();
    });

    test('does not warn when modifying converted Int32Array', async () => {
      const obj = new Int32Array(2);
      createSerializable(obj);
      await expect(() => {
        obj[1] = 2;
      }).not.toThrow();
    });

    test('handles unconfigurable object without throwing', async () => {
      const obj = {};
      Object.defineProperty(obj, 'prop', {
        value: 1,
        writable: false,
        enumerable: true,
        configurable: false,
      });
      await expect(() => {
        createSerializable(obj);
      }).not.toThrow();
    });
  });
}

declare global {
  var __reanimatedModuleProxy: Record<string, unknown>;
  var __workletsModuleProxy: Record<string, unknown>;
}
