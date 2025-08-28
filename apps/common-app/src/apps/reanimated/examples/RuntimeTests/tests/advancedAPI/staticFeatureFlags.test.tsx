import { getStaticFeatureFlag as getStaticFeatureFlagReanimated } from 'react-native-reanimated';
import { getStaticFeatureFlag as getStaticFeatureFlagWorklets } from 'react-native-worklets';

import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

/**
 * This flag is `false` by default - this test checks if setting it
 * to `true` in `package.json` is picked up on the native side.
 */
const RUNTIME_TEST_FLAG = 'RUNTIME_TEST_FLAG';

describe('Test getting static feature flags', () => {
  test('from Reanimated', () => {
    expect(getStaticFeatureFlagReanimated(RUNTIME_TEST_FLAG)).toBe(true);
  });
  test('from Worklets', () => {
    expect(getStaticFeatureFlagWorklets(RUNTIME_TEST_FLAG)).toBe(true);
  });
});
