'use strict';
import { DefaultStaticFeatureFlags } from '../staticFeatureFlags';
import staticFlagsJson from '../staticFlags.json';

describe('DefaultStaticFeatureFlags', () => {
  // The const mirrors staticFlags.json (the native source of truth) and is the
  // value source on web, where the native module can't be read. The type only
  // guards the key set, so this asserts the values stay in sync too.
  it('matches staticFlags.json', () => {
    expect(DefaultStaticFeatureFlags).toStrictEqual(staticFlagsJson);
  });
});
