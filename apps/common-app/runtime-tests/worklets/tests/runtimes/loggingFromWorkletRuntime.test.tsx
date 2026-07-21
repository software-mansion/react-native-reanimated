import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
} from '../../../ReJest/RuntimeTestsApi';
import {
  runOnUISync,
  createShareable,
  createSynchronizable,
  UIRuntimeId,
  createWorkletRuntime,
} from 'react-native-worklets';

declare global {
  // eslint-disable-next-line no-var
  var nativeLoggingHook:
    | ((serializedMessage: string, level: number) => void)
    | undefined;
}

type TestCase = {
  factory: () => unknown;
  /** Expected output. */
  expected: string;
  /** Assert the expected string is a substring of the output. */
  checkIncludes?: boolean;
};

// For closure
const hostObject = createWorkletRuntime({ name: 'HO' });
const shareable = createShareable(UIRuntimeId, 42);
const synchronizable = createSynchronizable(42);

const testCases: Record<string, TestCase> = {
  number: {
    expected: '1',
    factory: () => {
      'worklet';
      return 1;
    },
  },
  string: {
    expected: 'hello',
    factory: () => {
      'worklet';
      return 'hello';
    },
  },
  booleanTrue: {
    expected: 'true',
    factory: () => {
      'worklet';
      return true;
    },
  },
  booleanFalse: {
    expected: 'false',
    factory: () => {
      'worklet';
      return false;
    },
  },
  null: {
    expected: 'null',
    factory: () => {
      'worklet';
      return null;
    },
  },
  undefined: {
    expected: 'undefined',
    factory: () => {
      'worklet';
      return undefined;
    },
  },
  // BigInt is not serialized, loses type on transfer and arrives as {}
  bigInt: {
    expected: '{}',
    factory: () => {
      'worklet';
      return BigInt(42);
    },
  },
  // Symbol is not serialized, loses type on transfer and arrives as {}
  symbol: {
    expected: '{}',
    factory: () => {
      'worklet';
      return Symbol('test');
    },
  },
  emptyObject: {
    expected: '{}',
    factory: () => {
      'worklet';
      return {};
    },
  },
  nestedObject: {
    expected: '{ a: { b: { c: 1 } } }',
    factory: () => {
      'worklet';
      return { a: { b: { c: 1 } } };
    },
  },
  array: {
    expected: "[ 1, 'two', null, undefined, true ]",
    factory: () => {
      'worklet';
      return [1, 'two', null, undefined, true];
    },
  },
  nestedArray: {
    expected: '[ 1, [ 2, [ 3 ] ] ]',
    factory: () => {
      'worklet';
      return [1, [2, [3]]];
    },
  },
  workletFunction: {
    expected: '[Function: workletFn]',
    checkIncludes: true,
    factory: () => {
      'worklet';
      function workletFn() {
        'worklet';
      }
      return workletFn;
    },
  },
  hostObject: {
    expected: 'HO',
    checkIncludes: true,
    factory: () => {
      'worklet';
      return hostObject;
    },
  },
  hostFunction: {
    expected: '[Function: createSerializableNumber]',
    factory: () => {
      'worklet';
      return globalThis.__workletsModuleProxy.createSerializableNumber;
    },
  },
  generatorFunction: {
    expected: '[Function: gen]',
    factory: () => {
      'worklet';
      function* gen() {
        yield 1;
      }
      return gen;
    },
  },
  asyncFunction: {
    expected: '[Function: asyncFn]',
    factory: () => {
      'worklet';
      // eslint-disable-next-line no-empty-function
      async function asyncFn() {}
      return asyncFn;
    },
  },
  asyncGeneratorFunction: {
    expected: '[Function: asyncGenFn]',
    factory: () => {
      'worklet';
      // eslint-disable-next-line @typescript-eslint/require-await
      async function* asyncGenFn() {
        yield 1;
      }
      return asyncGenFn;
    },
  },
  error: {
    expected: '[Error: oops]',
    factory: () => {
      'worklet';
      return new Error('oops');
    },
  },
  rangeError: {
    expected: '[RangeError: out of range]',
    factory: () => {
      'worklet';
      return new RangeError('out of range');
    },
  },
  map: {
    // This logs correctly but only in Metro...
    expected: '{}',
    factory: () => {
      'worklet';
      return new Map([['key', 1]]);
    },
  },
  set: {
    // This logs correctly but only in Metro...
    expected: '{}',
    factory: () => {
      'worklet';
      return new Set([1, 2]);
    },
  },
  int8Array: {
    expected: "{ '0': 1, '1': 2, '2': 3 }",
    factory: () => {
      'worklet';
      return new Int8Array([1, 2, 3]);
    },
  },
  promise: {
    expected: '{ _x: 0, _y: 1, _z: undefined, _A: null }',
    factory: () => {
      'worklet';
      return new Promise<void>((r) => {
        r();
      });
    },
  },
  date: {
    expected: '1970',
    checkIncludes: true,
    factory: () => {
      'worklet';
      return new Date(0);
    },
  },
  regExp: {
    expected: '/abc/gi',
    factory: () => {
      'worklet';
      return /abc/gi;
    },
  },
  circularReference: {
    expected: '[Circular',
    checkIncludes: true,
    factory: () => {
      'worklet';
      const circular: Record<string, unknown> = { x: null };
      circular.x = circular;
      return circular;
    },
  },
  objectWithGetter: {
    expected: '[Getter]',
    checkIncludes: true,
    factory: () => {
      'worklet';
      const myObject = {
        internalValue: 42,
        get secretValue() {
          return this.internalValue;
        },
      };
      return myObject;
    },
  },
  turboModuleLike: {
    expected: '{ a: 1 }',
    factory: () => {
      'worklet';
      const obj: Record<string, unknown> = { a: 1 };
      Object.setPrototypeOf(obj, hostObject);
      return obj;
    },
  },
  serializableRef: {
    expected: `{ __serializableRef: true }`,
    factory: () => {
      'worklet';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (globalThis.__workletsModuleProxy as any).createSerializableNumber(
        42
      );
    },
  },
  shareable: {
    expected: `{ __serializableRef: true,\n  isHost: false,\n  __shareableRef: true,\n  getAsync: [Function],\n  getSync: [Function],\n  setAsync: [Function],\n  setSync: [Function] }`,
    factory: () => {
      'worklet';
      return shareable;
    },
  },
  synchronizable: {
    expected:
      '{ __serializableRef: true,\n  __synchronizableRef: true,\n  getDirty: [Function],\n  getBlocking: [Function],\n  setBlocking: [Function],\n  lock: [Function],\n  unlock: [Function] }',
    factory: () => {
      'worklet';
      return synchronizable;
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const originalHook = globalThis.nativeLoggingHook;

type ConsoleMethod = 'log' | 'warn' | 'error' | 'debug';

describe('loggingFromWorkletRuntime', () => {
  let message = '';

  beforeEach(() => {
    message = '';
    globalThis.nativeLoggingHook = (
      serializedMessage: string,
      _level: number
    ) => {
      message = serializedMessage;
    };
  });
  afterEach(() => {
    globalThis.nativeLoggingHook = originalHook;
  });

  const captureSerializedLog = (
    factory: () => unknown,
    method: ConsoleMethod = 'log'
  ): string => {
    try {
      console[method](factory());
    } catch (e) {
      console[method](`Error: ${(e as Error).message}`);
    }
    return message;
  };

  test('nativeLoggingHook is defined on worklets runtime in bundle mode', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const workletsNativeLoggingHook = runOnUISync(() => {
      'worklet';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return globalThis.nativeLoggingHook;
    }) as undefined | ((serializedMessage: string, level: number) => void);
    expect(workletsNativeLoggingHook !== undefined).toBe(true);
  });

  test.each(Object.keys(testCases))('%s serializes as expected', (key) => {
    const entry = testCases[key];
    const result = captureSerializedLog(entry.factory);
    if (entry.checkIncludes !== undefined) {
      expect(result.includes(entry.expected)).toBe(entry.checkIncludes);
    } else {
      expect(result).toBe(entry.expected);
    }
  });

  test.each(['warn', 'error', 'debug'] as const)(
    'console.%s is routed through nativeLoggingHook',
    (method) => {
      const result = captureSerializedLog(() => {
        'worklet';
        return { a: 1 };
      }, method);
      expect(result).toBe('{ a: 1 }');
    }
  );
});
