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

  function serializedWorklet(hash: number, closure: unknown[]) {
    return {
      __workletHash: hash,
      __closure: closure,
    } as WorkletFunction & { _recur: unknown };
  }

  test('passes the ordered closure to the factory, including undefined entries', () => {
    const factory = jest.fn(([z, missing, a]) => () => [z, missing, a]);
    metroRequire.mockReturnValue({ default: factory });
    const closure = [7, undefined, 'last'];
    const result = unpack(serializedWorklet(456, closure)) as () => unknown;
    expect(factory).toHaveBeenCalledWith(closure);
    expect(result()).toEqual(closure);
  });
});
