import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

describe('loggingFromWorkletRuntime', () => {
  if (!globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    return;
  }

  const captureSerializedLog = (value: unknown): string => {
    const originalHook = globalThis.nativeLoggingHook;
    globalThis.nativeLoggingHook = (serializedMessage: string, _level: number) => {
      throw serializedMessage;
    };
    try {
      console.log(value);
    } catch (serializedMessage) {
      globalThis.nativeLoggingHook = originalHook;
      return serializedMessage as string;
    }
    throw new Error('[loggingFromWorkletRuntime] this code should be unreachable');
  };

  test('nativeLoggingHook is defined', () => {
    expect(globalThis.nativeLoggingHook !== undefined).toBe(true);
  });

  test('serializes number', () => {
    expect(captureSerializedLog(1)).toBe('1');
  });

  test('serializes string', () => {
    expect(captureSerializedLog('hello')).toBe('hello');
  });

  test('serializes boolean', () => {
    expect(captureSerializedLog(true)).toBe('true');
    expect(captureSerializedLog(false)).toBe('false');
  });

  test('serializes null', () => {
    expect(captureSerializedLog(null)).toBe('null');
  });

  test('serializes undefined', () => {
    expect(captureSerializedLog(undefined)).toBe('undefined');
  });

  test('serializes empty object', () => {
    expect(captureSerializedLog({})).toBe('{}');
  });

  test('serializes nested object', () => {
    expect(captureSerializedLog({ a: { b: { c: 1 } } })).toBe('{ a: { b: { c: 1 } } }');
  });

  test('serializes array', () => {
    expect(captureSerializedLog([1, 'two', null, undefined, true])).toBe("[ 1, 'two', null, undefined, true ]");
  });

  test('serializes nested array', () => {
    expect(captureSerializedLog([1, [2, [3]]])).toBe('[ 1, [ 2, [ 3 ] ] ]');
  });

  test('serializes host function', () => {
    expect(captureSerializedLog(globalThis.nativeLoggingHook)).toBe('[Function: nativeLoggingHook]');
  });

  test('serializes generator function', () => {
    function* gen() {
      yield 1;
    }
    expect(captureSerializedLog(gen)).toBe('[Function: gen]');
  });

  test('serializes async function', () => {
    async function asyncFn() {}
    expect(captureSerializedLog(asyncFn)).toBe('[Function: asyncFn]');
  });

  test('serializes async generator function', () => {
    async function* asyncGenFn() {
      yield 1;
    }
    expect(captureSerializedLog(asyncGenFn)).toBe('[Function: asyncGenFn]');
  });

  test('serializes RegExp', () => {
    expect(captureSerializedLog(/abc/gi)).toBe('/abc/gi');
  });

  test('serializes circular reference', () => {
    const circular: Record<string, unknown> = { x: null };
    circular.x = circular;
    expect(captureSerializedLog(circular).includes('[Circular')).toBe(true);
  });

  test('serializes object with getter', () => {
    const objectWithGetter = {
      _accessCount: 0,
      get sensitiveData() {
        this._accessCount++;
        return `Access count: ${this._accessCount}`;
      },
    };
    expect(captureSerializedLog(objectWithGetter).includes('[Getter]')).toBe(true);
  });
});
