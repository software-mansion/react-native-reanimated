'use strict';
import { DefaultStaticFeatureFlags } from '../staticFeatureFlags';
import staticFlagsJson from '../staticFlags.json';

describe('DefaultStaticFeatureFlags', () => {
  it('matches staticFlags.json', () => {
    expect(DefaultStaticFeatureFlags).toStrictEqual(staticFlagsJson);
  });
});
