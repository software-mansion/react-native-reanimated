/* eslint-disable @typescript-eslint/no-unused-vars */
import { getStaticFeatureFlag } from '..';

function GetStaticFeatureFlagTest() {
  // ok - this flag exists
  getStaticFeatureFlag('RUNTIME_TEST_FLAG');

  // @ts-expect-error - this flag does not exist
  getStaticFeatureFlag('NON_EXISTENT_FLAG');
}
