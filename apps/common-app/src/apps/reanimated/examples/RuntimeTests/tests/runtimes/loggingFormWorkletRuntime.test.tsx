import { describe, expect, test, notify, waitForNotification } from '../../ReJest/RuntimeTestsApi';
import { runOnUISync, scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

type TestCase = {
  factory: () => unknown;
  expected?: string;
  bundleMode?: string;
  noBundleMode?: string;
  checkIncludes?: boolean | { bundleMode: boolean; noBundleMode: boolean };
};

const testCases: Record<string, TestCase> = {
  number: {
    factory: () => {
      'worklet';
      return 1;
    },
    expected: '1',
  },
  string: {
    factory: () => {
      'worklet';
      return 'hello';
    },
    expected: 'hello',
  },
  booleanTrue: {
    factory: () => {
      'worklet';
      return true;
    },
    expected: 'true',
  },
  booleanFalse: {
    factory: () => {
      'worklet';
      return false;
    },
    expected: 'false',
  },
  null: {
    factory: () => {
      'worklet';
      return null;
    },
    expected: 'null',
  },
  undefined: {
    factory: () => {
      'worklet';
      return undefined;
    },
    expected: 'undefined',
  },
  emptyObject: {
    factory: () => {
      'worklet';
      return {};
    },
    expected: '{}',
  },
  nestedObject: {
    bundleMode: '{ a: { b: { c: 1 } } }',
    noBundleMode: '{ a: { b: { c: 1 } } }',
    factory: () => {
      'worklet';
      return { a: { b: { c: 1 } } };
    },
  },
  array: {
    bundleMode: "[ 1, 'two', null, undefined, true ]",
    noBundleMode: "[ 1, 'two', null, undefined, true ]",
    factory: () => {
      'worklet';
      return [1, 'two', null, undefined, true];
    },
  },
  nestedArray: {
    bundleMode: '[ 1, [ 2, [ 3 ] ] ]',
    noBundleMode: '[ 1, [ 2, [ 3 ] ] ]',
    factory: () => {
      'worklet';
      return [1, [2, [3]]];
    },
  },
  // generatorFunction: {
  //   nativeLoggingHook: '[Function: gen]',
  //   customSerializer: `[Function fun]`,
  //   factory: () => {
  //     'worklet';
  //     function* gen() {
  //       yield 1;
  //     }
  //     return gen;
  //   },
  // },
  // asyncFunction: {
  //   nativeLoggingHook: '[Function: asyncFn]',
  //   customSerializer: `[Function fun]`,
  //   factory: () => {
  //     'worklet';
  //     async function asyncFn() {}
  //     return asyncFn;
  //   },
  // },
  // asyncGeneratorFunction: {
  //   nativeLoggingHook: '[Function: asyncGenFn]',
  //   customSerializer: `[Function fun]`,
  //   factory: () => {
  //     'worklet';
  //     async function* asyncGenFn() {
  //       yield 1;
  //     }
  //     return asyncGenFn;
  //   },
  // },
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
};

const diffMapKey = globalThis._WORKLETS_BUNDLE_MODE_ENABLED ? 'bundleMode' : 'noBundleMode';
const originalHook = globalThis.nativeLoggingHook;

describe('loggingFromWorkletRuntime', async () => {
  const captureSerializedLog = async (factory: () => unknown): Promise<string> => {
    let message = 'INITIAL_VALUE_YOU_SHOULD_NOT_SEE_THIS';

    globalThis.nativeLoggingHook = (serializedMessage: string, _level: number) => {
      message = serializedMessage;
      originalHook(`Captured: ${serializedMessage}`, _level);
    };

    const notifyWrapper = () => notify('LOG_CAPTURED');
    if (!globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      runOnUISync(() => {
        'worklet';
        try {
          console.log(factory());
        } catch (e) {
          // Error - eg. circular reference
        }
        scheduleOnRN(notifyWrapper);
      });

      await waitForNotification('LOG_CAPTURED');
    } else {
      console.log(factory());
    }
    globalThis.nativeLoggingHook = originalHook;

    return message;
  };

  test('nativeLoggingHook is defined on worklets runtime in bundle mode', () => {
    const workletsNativeLoggingHook = runOnUISync(() => {
      'worklet';
      return globalThis.nativeLoggingHook;
    }) as undefined | ((serializedMessage: string, level: number) => void);
    expect(workletsNativeLoggingHook !== undefined).toBe(!!globalThis._WORKLETS_BUNDLE_MODE_ENABLED);
  });

  Object.entries(testCases).forEach(([key, entry]) => {
    test(`${key} serializes as expected`, async () => {
      const expected = entry.expected ?? entry[diffMapKey]!;
      const result = await captureSerializedLog(entry.factory);
      const checkIncludes =
        typeof entry.checkIncludes === 'object' ? entry.checkIncludes[diffMapKey] : entry.checkIncludes;
      if (checkIncludes !== undefined) {
        expect(result.includes(expected)).toBe(checkIncludes);
      } else {
        expect(result).toBe(expected);
      }
    });
  });
});
