import { describe, expect, jest, test } from '@jest/globals';

import type { bundleValueUnpacker } from '../src/memory/bundleUnpacker';

describe('bundleValueUnpacker', () => {
  test('returns a worklet that throws when its module cannot be loaded', () => {
    const worklet = () => 1;
    const globals = globalThis as unknown as { __r?: (id: number) => unknown };
    const previousRequire = globals.__r;
    globals.__r = (id: number) => {
      if (id === 1) {
        return { default: worklet };
      }
      if (id === 3) {
        throw null;
      }
      if (id === 4) {
        throw Object.create(null);
      }
      throw new Error(`Requiring unknown module "${id}".`);
    };
    try {
      jest.isolateModules(() => {
        const { bundleValueUnpacker: unpack } =
          require('../src/memory/bundleUnpacker') as {
            bundleValueUnpacker: typeof bundleValueUnpacker;
          };
        expect(unpack({ __workletHash: 1 } as never)).toBe(worklet);
        const unresolved = unpack({ __workletHash: 2 } as never) as () => void;
        expect(unresolved).toThrow('Unable to resolve worklet with hash 2');
        const thrownNull = unpack({ __workletHash: 3 } as never) as () => void;
        expect(thrownNull).toThrow('Original error: null');
        const thrownBareObject = unpack({
          __workletHash: 4,
        } as never) as () => void;
        expect(thrownBareObject).toThrow(TypeError);
      });
    } finally {
      globals.__r = previousRequire;
    }
  });
});
