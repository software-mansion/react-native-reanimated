import {
  createSerializableArray,
  createSerializableArrayBuffer,
  createSerializableArrayBufferView,
  createSerializableError,
  createSerializableMap,
  createSerializableObject,
  createSerializableRegExp,
  createSerializableSet,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

describe('Test createSerializable[Type]', () => {
  const PASS_NOTIFICATION = 'PASS';
  let result = false;

  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  const targets = [
    {
      scheduleOnTarget: (worklet: () => void) => {
        scheduleOnUI(worklet);
      },
      targetRuntime: 'UI',
    },
    {
      scheduleOnTarget: (worklet: () => void) => {
        scheduleOnRuntime(workletRuntime, worklet);
      },
      targetRuntime: 'Worker',
    },
  ];

  const callbackPass = (ok: boolean) => {
    result = ok;
    notify(PASS_NOTIFICATION);
  };

  targets.forEach(({ targetRuntime, scheduleOnTarget }) => {
    describe(`on ${targetRuntime} Runtime`, () => {
      beforeEach(() => {
        result = false;
      });

      test('createSerializableArray', async () => {
        const serializable = createSerializableArray([1, 'a', { b: 2 }]);
        scheduleOnTarget(() => {
          'worklet';
          const value = serializable as unknown as [
            number,
            string,
            { b: number },
          ];
          scheduleOnRN(
            callbackPass,
            Array.isArray(value) &&
              value[0] === 1 &&
              value[1] === 'a' &&
              value[2].b === 2
          );
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableObject', async () => {
        const serializable = createSerializableObject({ a: 1, b: [2] });
        scheduleOnTarget(() => {
          'worklet';
          const value = serializable as unknown as { a: number; b: number[] };
          scheduleOnRN(callbackPass, value.a === 1 && value.b[0] === 2);
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableMap', async () => {
        const serializable = createSerializableMap(new Map([['a', 1]]));
        scheduleOnTarget(() => {
          'worklet';
          const value = serializable as unknown as Map<string, number>;
          scheduleOnRN(
            callbackPass,
            value instanceof Map && value.get('a') === 1
          );
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableSet', async () => {
        const serializable = createSerializableSet(new Set([1, 2]));
        scheduleOnTarget(() => {
          'worklet';
          const value = serializable as unknown as Set<number>;
          scheduleOnRN(
            callbackPass,
            value instanceof Set && value.has(1) && value.has(2)
          );
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableError', async () => {
        const serializable = createSerializableError(new TypeError('test'));
        scheduleOnTarget(() => {
          'worklet';
          const value = serializable as unknown as Error;
          scheduleOnRN(
            callbackPass,
            value instanceof Error && value.message === 'test'
          );
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableRegExp', async () => {
        const serializable = createSerializableRegExp(/te.t/gi);
        scheduleOnTarget(() => {
          'worklet';
          const value = serializable as unknown as RegExp;
          scheduleOnRN(
            callbackPass,
            value instanceof RegExp &&
              value.source === 'te.t' &&
              value.flags === 'gi'
          );
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableArrayBuffer', async () => {
        const buffer = new Uint8Array([1, 2, 3]).buffer;
        const serializable = createSerializableArrayBuffer(buffer);
        scheduleOnTarget(() => {
          'worklet';
          const value = serializable as unknown as ArrayBuffer;
          scheduleOnRN(
            callbackPass,
            value instanceof ArrayBuffer && new Uint8Array(value)[2] === 3
          );
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });

      test('createSerializableArrayBufferView', async () => {
        const serializable = createSerializableArrayBufferView(
          new Uint8Array([1, 2, 3])
        );
        scheduleOnTarget(() => {
          'worklet';
          const value = serializable as unknown as Uint8Array;
          scheduleOnRN(
            callbackPass,
            value instanceof Uint8Array && value[2] === 3
          );
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(result).toBe(true);
      });
    });
  });

  test('returns the same reference for the same value', () => {
    const map = new Map([['a', 1]]);
    expect(createSerializableMap(map) === createSerializableMap(map)).toBe(
      true
    );
  });

  if (__DEV__) {
    test('throws on a value of the wrong type', async () => {
      await expect(() => {
        createSerializableMap(new Set([1]) as unknown as Map<number, number>);
      }).toThrow('`createSerializableMap` expects a Map.');
      await expect(() => {
        createSerializableObject(new Map());
      }).toThrow('`createSerializableObject` expects a plain object.');
      await expect(() => {
        createSerializableArrayBufferView(
          new ArrayBuffer(8) as unknown as Uint8Array
        );
      }).toThrow(
        '`createSerializableArrayBufferView` expects a typed array or a DataView.'
      );
    });
  }
});
