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

// `expected`, same output in both modes
// `bundleMode` / `noBundleMode`, output differs between modes
// `checkIncludes`, assert the expected string is (or isn't) a substring of the output
// `errorsOnNoBundleMode`, console.log throws on the UI thread; the caught error message is logged instead
type TestCase = {
  factory: () => unknown;
  expected?: string;
  bundleMode?: string;
  noBundleMode?: string;
  checkIncludes?: boolean | { bundleMode: boolean; noBundleMode: boolean };
  errorsOnNoBundleMode?: boolean;
};

// https://docs.swmansion.com/react-native-worklets/docs/memory/serializable

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
  // workletFunction: this example fails when bundle mode is off, as RN runtime does not have valueUnpacker
  // workletFunction: {
  //   bundleMode: '[Function: workletFn]',
  //   noBundleMode: '{}',
  //   checkIncludes: { bundleMode: true, noBundleMode: false },
  //   errorsOnNoBundleMode: true,
  //   factory: () => {
  //     'worklet';
  //     function workletFn() {
  //       'worklet';
  //     }
  //     return workletFn;
  //   },
  // },
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
  // Error types: bundle mode shows [ErrorName: message], no-bundle mode loses Error prototype on transfer
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
  // Map loses its type on transfer, arrives as {} in both modes
  map: {
    expected: '{}',
    factory: () => {
      'worklet';
      return new Map([['key', 1]]);
    },
  },
  // Set loses its type on transfer, arrives as {} in both modes
  set: {
    expected: '{}',
    factory: () => {
      'worklet';
      return new Set([1, 2]);
    },
  },
  // Int8Array loses its type on transfer, numeric keys are enumerated as plain object properties
  int8Array: {
    expected: "{ '0': 1, '1': 2, '2': 3 }",
    factory: () => {
      'worklet';
      return new Int8Array([1, 2, 3]);
    },
  },
  // Abstractions: bundle mode shows [TypeName], no-bundle mode loses type on transfer
  // Promise loses its type on transfer in both modes and exposes Hermes internal fields
  promise: {
    expected: '{ _x: 0, _y: 1, _z: undefined, _A: null }',
    factory: () => {
      'worklet';
      return new Promise<void>(r => {
        r();
      });
    },
  },
  // Date: bundle mode calls toString(), no-bundle mode loses type on transfer
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
  // Special types: bundle mode has rich serialization, no-bundle mode enumerates properties
  regExp: {
    bundleMode: '/abc/gi',
    noBundleMode: '{}',
    factory: () => {
      'worklet';
      return /abc/gi;
    },
  },
  // Circular reference: bundle mode detects it, no-bundle mode throws stack overflow
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
  // Getters: bundle mode exposes them as [Getter], no-bundle mode reads the value
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

// eslint-disable-next-line @typescript-eslint/require-await
describe('loggingFromWorkletRuntime', async () => {
  let message = '';

  const captureSerializedLog = async (factory: () => unknown): Promise<string> => {
    if (isBundleMode) {
      try {
        console.log(factory());
      } catch (e) {
        console.log(`Error: ${(e as Error).message}`);
      }
      return message;
    } else {
      const notifyWrapper = () => notify('LOG_CAPTURED');
      runOnUISync(() => {
        'worklet';
        try {
          console.log(factory());
        } catch (e) {
          console.log(`Error: ${(e as Error).message}`);
        }
        scheduleOnRN(notifyWrapper);
      });
      await waitForNotification('LOG_CAPTURED');
      return message;
    }
  };

  test('setup beforeEach and afterEach', () => {
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

  test('nativeLoggingHook is defined on worklets runtime in bundle mode', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const workletsNativeLoggingHook = runOnUISync(() => {
      'worklet';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return globalThis.nativeLoggingHook;
    }) as undefined | ((serializedMessage: string, level: number) => void);
    expect(workletsNativeLoggingHook !== undefined).toBe(!!isBundleMode);
  });

  test.each(Object.keys(testCases))('%s serializes as expected', async key => {
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
});
