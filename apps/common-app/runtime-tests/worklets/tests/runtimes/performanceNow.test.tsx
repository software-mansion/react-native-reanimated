import { runOnRuntimeSync, runOnUISync } from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

describe('performance.now', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  test('uses the same clock on the UI Runtime as on the RN Runtime', () => {
    const rnBefore = performance.now();
    const uiNow = runOnUISync(() => {
      'worklet';
      return performance.now();
    });
    const rnAfter = performance.now();

    expect(uiNow).toBeWithinRange(rnBefore, rnAfter);
  });

  test('uses the same clock on a Worker Runtime as on the RN Runtime', () => {
    const rnBefore = performance.now();
    const workerNow = runOnRuntimeSync(workletRuntime, () => {
      'worklet';
      return performance.now();
    });
    const rnAfter = performance.now();

    expect(workerNow).toBeWithinRange(rnBefore, rnAfter);
  });
});
