import { describe, expect, test, notify, waitForNotification } from '../../ReJest/RuntimeTestsApi';
import { runOnUISync, scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

const diffMap = {
  nestedObject: {
    nativeLoggingHook: '{ a: { b: { c: 1 } } }',
    customSerializer: `{"a": {"b": {"c": 1}}}`,
  },
  array: {
    nativeLoggingHook: "[ 1, 'two', null, undefined, true ]",
    customSerializer: `[1, "two", null, undefined, true]`,
  },
  nestedArray: {
    nativeLoggingHook: '[ 1, [ 2, [ 3 ] ] ]',
    customSerializer: `[1, [2, [3]]]`,
  },
  generatorFunction: {
    nativeLoggingHook: '[Function: gen]',
    customSerializer: `[Function fun]`,
  },
  asyncFunction: {
    nativeLoggingHook: '[Function: asyncFn]',
    customSerializer: `[Function fun]`,
  },
  asyncGeneratorFunction: {
    nativeLoggingHook: '[Function: asyncGenFn]',
    customSerializer: `[Function fun]`,
  },
};

const diffMapKey = globalThis._WORKLETS_BUNDLE_MODE_ENABLED ? 'nativeLoggingHook' : 'customSerializer';

describe('loggingFromWorkletRuntime', async () => {
  const captureSerializedLog = async (value: unknown): Promise<string> => {
    const originalHook = globalThis.nativeLoggingHook;
    let message = 'INITIAL_VALUE_YOU_SHOULD_NOT_SEE_THIS';

    globalThis.nativeLoggingHook = (serializedMessage: string, _level: number) => {
      message.data = serializedMessage;
      return;
    };

    const factory = () => value;

    scheduleOnUI(() => {
      'worklet';
      const value = factory();
      console.log(value);
      scheduleOnRN(notify, 'LOG_CAPTURED');
    });

    // throw message.data;
    await waitForNotification('LOG_CAPTURED');
    globalThis.nativeLoggingHook = originalHook;
    return message;
  };

  // console.log(new Date().toDateString());

  test('nativeLoggingHook is defined on worklets runtime in bundle mode', () => {
    const workletsNativeLoggingHook = runOnUISync(() => {
      'worklet';
      return globalThis.nativeLoggingHook;
    }) as undefined | ((serializedMessage: string, level: number) => void);
    expect(workletsNativeLoggingHook !== undefined).toBe(!!globalThis._WORKLETS_BUNDLE_MODE_ENABLED);
  });

  test('serializes number', async () => {
    expect(await captureSerializedLog(1)).toBe('1');
  });

  test('serializes string', async () => {
    expect(await captureSerializedLog('hello')).toBe('hello');
  });

  test('serializes boolean', async () => {
    expect(await captureSerializedLog(true)).toBe('true');
    expect(await captureSerializedLog(false)).toBe('false');
  });

  test('serializes null', async () => {
    expect(await captureSerializedLog(null)).toBe('null');
  });

  test('serializes undefined', async () => {
    expect(await captureSerializedLog(undefined)).toBe('undefined');
  });

  test('serializes empty object', async () => {
    expect(await captureSerializedLog({})).toBe('{}');
  });

  test('serializes nested object', async () => {
    expect(await captureSerializedLog({ a: { b: { c: 1 } } })).toBe(diffMap.nestedObject[diffMapKey]);
  });

  test('serializes array', async () => {
    expect(await captureSerializedLog([1, 'two', null, undefined, true])).toBe(diffMap.array[diffMapKey]);
  });

  test('serializes nested array', async () => {
    expect(await captureSerializedLog([1, [2, [3]]])).toBe(diffMap.nestedArray[diffMapKey]);
  });

  test('serializes generator function', async () => {
    function* gen() {
      yield 1;
    }
    expect(await captureSerializedLog(gen)).toBe(diffMap.generatorFunction[diffMapKey]);
  });

  test('serializes async function', async () => {
    async function asyncFn() {}
    expect(await captureSerializedLog(asyncFn)).toBe(diffMap.asyncFunction[diffMapKey]);
  });

  test('serializes async generator function', async () => {
    async function* asyncGenFn() {
      yield 1;
    }
    expect(await captureSerializedLog(asyncGenFn)).toBe(diffMap.asyncGeneratorFunction[diffMapKey]);
  });

  test('serializes RegExp', async () => {
    expect(await captureSerializedLog(/abc/gi)).toBe('/abc/gi');
  });

  test('serializes circular reference', async () => {
    const circular: Record<string, unknown> = { x: null };
    circular.x = circular;
    expect(await captureSerializedLog(circular).includes('[Circular')).toBe(true);
  });

  test('serializes object with getter', async () => {
    const objectWithGetter = {
      _accessCount: 0,
      get sensitiveData() {
        this._accessCount++;
        return `Access count: ${this._accessCount}`;
      },
    };
    expect(await captureSerializedLog(objectWithGetter).includes('[Getter]')).toBe(true);
  });
});
