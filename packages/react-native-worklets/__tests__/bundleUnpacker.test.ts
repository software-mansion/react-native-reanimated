// eslint-disable-next-line no-restricted-imports
import type * as BundleUnpacker from '../src/memory/bundleUnpacker.native';
import type { WorkletFunction } from '../src/types';

describe('bundle unpacker', () => {
  const metroRequire = jest.fn();
  let unpack: typeof BundleUnpacker.bundleValueUnpacker;
  const previousRequire = globalThis.__r;

  beforeEach(() => {
    jest.resetModules();
    metroRequire.mockReset();
    globalThis.__r = metroRequire;
    unpack = jest.requireActual<typeof BundleUnpacker>(
      '../src/memory/bundleUnpacker.native'
    ).bundleValueUnpacker;
  });

  afterEach(() => {
    globalThis.__r = previousRequire;
  });

  function serializedWorklet(hash: number, closure?: unknown[]) {
    return {
      __workletHash: hash,
      ...(closure === undefined ? {} : { __closure: closure }),
    } as WorkletFunction & { _recur: unknown };
  }

  test.each([true, false])(
    'does not call closure-free exports on load (dev: %s)',
    (dev) => {
      const previousDev = globalThis.__DEV__;
      globalThis.__DEV__ = dev;
      try {
        const worklet = jest.fn((value: number) => value + 1);
        metroRequire.mockReturnValue({ default: worklet });
        const result = unpack(serializedWorklet(123));
        expect(result).toBe(worklet);
        expect(metroRequire).toHaveBeenCalledWith(123);
        expect(worklet).not.toHaveBeenCalled();
        expect((result as (value: number) => number)(41)).toBe(42);
      } finally {
        globalThis.__DEV__ = previousDev;
      }
    }
  );

  test('passes the ordered closure to the factory, including undefined entries', () => {
    const factory = jest.fn(([z, missing, a]) => () => [z, missing, a]);
    metroRequire.mockReturnValue({ default: factory });
    const closure = [7, undefined, 'last'];
    const result = unpack(serializedWorklet(456, closure)) as () => unknown;
    expect(factory).toHaveBeenCalledWith(closure);
    expect(result()).toEqual(closure);
  });
});
