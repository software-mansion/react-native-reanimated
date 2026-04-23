import {
  describe,
  expect,
  test,
  notify,
  waitForNotification,
  beforeEach,
  afterEach,
} from '../../ReJest/RuntimeTestsApi';
import { runOnUISync, scheduleOnRN, createShareable, createSynchronizable, UIRuntimeId } from 'react-native-worklets';

declare global {
  // eslint-disable-next-line no-var
  var nativeLoggingHook: ((serializedMessage: string, level: number) => void) | undefined;
}

type TestCase = {
  factory: () => unknown;
  /** Expected output; identical in both modes. */
  expected?: string;
  /** Expected output in bundle mode (when it differs from no-bundle mode). */
  bundleMode?: string;
  /** Expected output in no-bundle mode (when it differs from bundle mode). */
  noBundleMode?: string;
  /** Assert the expected string is (or isn't) a substring of the output. */
  checkIncludes?: boolean | { bundleMode: boolean; noBundleMode: boolean };
  /** In no-bundle mode console.log throws on the UI thread; the caught error message is logged instead. */
  errorsOnNoBundleMode?: boolean;
  /** Test only runs in bundle mode (skipped otherwise). */
  bundleModeOnly?: boolean;
};

// For closure
const reanimatedModuleProxy = globalThis.__reanimatedModuleProxy;
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
    bundleMode: '{}',
    noBundleMode: 'Symbol(test)',
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
    bundleModeOnly: true,
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
    expected: 'registerSensor',
    checkIncludes: { bundleMode: true, noBundleMode: true },
    factory: () => {
      'worklet';
      return reanimatedModuleProxy;
    },
  },
  hostFunction: {
    bundleMode: '[Function: createSerializable]',
    noBundleMode: '{}',
    factory: () => {
      'worklet';
      return globalThis.__workletsModuleProxy.createSerializable;
    },
  },
  generatorFunction: {
    bundleMode: '[Function: gen]',
    noBundleMode: '{}',
    factory: () => {
      'worklet';
      function* gen() {
        yield 1;
      }
      return gen;
    },
  },
  asyncFunction: {
    bundleMode: '[Function: asyncFn]',
    noBundleMode: '{}',
    factory: () => {
      'worklet';
      // eslint-disable-next-line no-empty-function
      async function asyncFn() {}
      return asyncFn;
    },
  },
  asyncGeneratorFunction: {
    bundleMode: '[Function: asyncGenFn]',
    noBundleMode: '{}',
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
    bundleMode: '[Error: oops]',
    noBundleMode: '{}',
    factory: () => {
      'worklet';
      return new Error('oops');
    },
  },
  rangeError: {
    bundleMode: '[RangeError: out of range]',
    noBundleMode: '{}',
    factory: () => {
      'worklet';
      return new RangeError('out of range');
    },
  },
  map: {
    expected: '{}',
    factory: () => {
      'worklet';
      return new Map([['key', 1]]);
    },
  },
  set: {
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
      return new Promise<void>(r => {
        r();
      });
    },
  },
  date: {
    expected: '1970',
    bundleMode: 'Thu Jan 01 1970 00:00:00 GMT+0000 (UTC)',
    noBundleMode: '{}',
    checkIncludes: { bundleMode: true, noBundleMode: false },
    factory: () => {
      'worklet';
      return new Date(0);
    },
  },
  regExp: {
    bundleMode: '/abc/gi',
    noBundleMode: '{}',
    factory: () => {
      'worklet';
      return /abc/gi;
    },
  },
  circularReference: {
    expected: '[Circular',
    checkIncludes: { bundleMode: true, noBundleMode: false },
    errorsOnNoBundleMode: true,
    factory: () => {
      'worklet';
      const circular: Record<string, unknown> = { x: null };
      circular.x = circular;
      return circular;
    },
  },
  objectWithGetter: {
    expected: '[Getter]',
    checkIncludes: { bundleMode: true, noBundleMode: false },
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
    errorsOnNoBundleMode: true,
    factory: () => {
      'worklet';
      const obj: Record<string, unknown> = { a: 1 };
      Object.setPrototypeOf(obj, reanimatedModuleProxy);
      return obj;
    },
  },
  serializableRef: {
    bundleMode: `{ __serializableRef: true }`,
    noBundleMode: '42',
    factory: () => {
      'worklet';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (globalThis.__workletsModuleProxy as any).createSerializable(42);
    },
  },
  shareable: {
    bundleMode: `{ __serializableRef: true,\n  isHost: false,\n  __shareableRef: true,\n  getAsync: [Function],\n  getSync: [Function],\n  setAsync: [Function],\n  setSync: [Function] }`,
    noBundleMode: '{ isHost: true, __shareableRef: true, value: 42 }',
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

// eslint-disable-next-line no-underscore-dangle
const isBundleMode = globalThis._WORKLETS_BUNDLE_MODE_ENABLED;
const modeKey = isBundleMode ? 'bundleMode' : 'noBundleMode';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const originalHook = globalThis.nativeLoggingHook;

type ConsoleMethod = 'log' | 'warn' | 'error' | 'debug';

describe('loggingFromWorkletRuntime', () => {
  let message = '';

  test('setup beforeEach and afterEach', () => {
    // TODO: there's a bug in ReJest and beforeEach/afterEach have to be
    // registered inside a test case.
    beforeEach(() => {
      message = '';
      globalThis.nativeLoggingHook = (serializedMessage: string, _level: number) => {
        message = serializedMessage;
      };
    });
    afterEach(() => {
      globalThis.nativeLoggingHook = originalHook;
    });
  });

  const captureSerializedLog = async (factory: () => unknown, method: ConsoleMethod = 'log'): Promise<string> => {
    if (isBundleMode) {
      try {
        console[method](factory());
      } catch (e) {
        console[method](`Error: ${(e as Error).message}`);
      }
      return message;
    } else {
      const notifyWrapper = () => notify('LOG_CAPTURED');
      runOnUISync(() => {
        'worklet';
        try {
          console[method](factory());
        } catch (e) {
          console[method](`Error: ${(e as Error).message}`);
        }
        scheduleOnRN(notifyWrapper);
      });
      await waitForNotification('LOG_CAPTURED');
      return message;
    }
  };

  test('nativeLoggingHook is defined on worklets runtime in bundle mode', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const workletsNativeLoggingHook = runOnUISync(() => {
      'worklet';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return globalThis.nativeLoggingHook;
    }) as undefined | ((serializedMessage: string, level: number) => void);
    expect(workletsNativeLoggingHook !== undefined).toBe(!!isBundleMode);
  });

  const testKeys = Object.keys(testCases).filter(key => !testCases[key].bundleModeOnly || isBundleMode);

  test.each(testKeys)('%s serializes as expected', async key => {
    const entry = testCases[key];
    const expected = entry.expected ?? entry[modeKey]!;
    const result = await captureSerializedLog(entry.factory);
    const checkIncludes = typeof entry.checkIncludes === 'object' ? entry.checkIncludes[modeKey] : entry.checkIncludes;
    if (entry.errorsOnNoBundleMode && !isBundleMode) {
      expect(result.startsWith('Error:')).toBe(true);
    } else if (checkIncludes !== undefined) {
      expect(result.includes(expected)).toBe(checkIncludes);
    } else {
      expect(result).toBe(expected);
    }
  });

  test.each(['warn', 'error', 'debug'] as const)('console.%s is routed through nativeLoggingHook', async method => {
    const result = await captureSerializedLog(() => {
      'worklet';
      return { a: 1 };
    }, method);
    expect(result).toBe('{ a: 1 }');
  });
});
