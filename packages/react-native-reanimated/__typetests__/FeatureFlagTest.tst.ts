import { describe, expect, test } from 'tstyche';

import { getStaticFeatureFlag } from '..';

describe('getStaticFeatureFlag', () => {
  test('accepts a known static feature flag', () => {
    expect(getStaticFeatureFlag).type.toBeCallableWith('RUNTIME_TEST_FLAG');
  });

  test('rejects an unknown feature flag', () => {
    expect(getStaticFeatureFlag).type.not.toBeCallableWith('NON_EXISTENT_FLAG');
  });
});
