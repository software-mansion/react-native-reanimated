import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';
import { scheduleOnUI, type WorkletFunction } from 'react-native-worklets';

describe('Test plugin version mismatch', () => {
  if (__DEV__) {
    // This test doesn't apply to Release bundles.
    test('short worklet with wrong plugin version throws', async () => {
      await expect(() => {
        const worklet = (() => {
          'worklet';
        }) as WorkletFunction;
        worklet.__pluginVersion = 'x.y.z';
        scheduleOnUI(worklet);
      }).toThrow('[Worklets] Mismatch between JavaScript code version and Worklets Babel plugin version');
    });
  }
});
