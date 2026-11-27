import { describe, expect, jest, test } from '@jest/globals';

import { bundleValueUnpacker } from '../src/memory/bundleUnpacker.native';

describe('bundleValueUnpacker', () => {
  test('explains a worklet compiled without Metro', () => {
    expect(() => bundleValueUnpacker({ __workletHash: 1 } as never)).toThrow(
      'compiled without Metro'
    );
  });

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
          require('../src/memory/bundleUnpacker.native') as {
            bundleValueUnpacker: typeof bundleValueUnpacker;
          };
        expect(unpack({ __moduleId: 1 } as never)).toBe(worklet);
        const unresolved = unpack({ __moduleId: 2 } as never) as () => void;
        expect(unresolved).toThrow('Unable to resolve worklet from module 2');
        const thrownNull = unpack({ __moduleId: 3 } as never) as () => void;
        expect(thrownNull).toThrow('Original error: null');
        const thrownBareObject = unpack({
          __moduleId: 4,
        } as never) as () => void;
        expect(thrownBareObject).toThrow(
          'Original error: a value that cannot be converted to a string'
        );
      });
    } finally {
      globals.__r = previousRequire;
    }
  });
});
