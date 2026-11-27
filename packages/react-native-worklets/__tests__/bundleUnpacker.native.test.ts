import { describe, expect, test } from '@jest/globals';

import { bundleValueUnpacker } from '../src/memory/bundleUnpacker.native';

describe('bundleValueUnpacker', () => {
  test('explains a worklet compiled without Metro', () => {
    expect(() =>
      bundleValueUnpacker({ __workletHash: 1 } as never)
    ).toThrow('compiled without Metro');
  });
});
