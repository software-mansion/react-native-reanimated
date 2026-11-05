import { Platform } from 'react-native';
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

describe('UI Runtime timer clock', () => {
  test('uses the clock of React Native timers on this platform', () => {
    const readRNClock =
      Platform.OS === 'android' ? () => performance.now() : () => Date.now();
    const rnBefore = Math.floor(readRNClock());
    const timerNow = runOnUISync(() => {
      'worklet';
      return globalThis._getTimerTimestamp();
    });
    const rnAfter = Math.floor(readRNClock()) + 1;

    expect(timerNow).toBeWithinRange(rnBefore, rnAfter);
  });
});

declare global {
  var _getTimerTimestamp: () => number;
}
