import {
  createSynchronizable,
  createWorkletRuntime,
  scheduleOnRN,
  runOnRuntimeSync,
  scheduleOnRuntime,
} from 'react-native-worklets';
import { describe, expect, test, notify, waitForNotification } from '../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../ReJest/types';

const NOTIFICATION_NAME = 'NOTIFICATION_NAME';

describe('runOnRuntimeSync', () => {
  test('use runOnRuntimeSync to run a function on the Worker Runtime from RN Runtime', () => {
    // Arrange
    const workletRuntime = createWorkletRuntime({ name: 'test' });

    // Act
    const result = runOnRuntimeSync(workletRuntime, () => {
      'worklet';
      return 100;
    });

    // Assert
    expect(result).toBe(100, ComparisonMode.NUMBER);
  });

  test('keep the correct order of execution runOnRuntimeSync and scheduleOnRuntime', async () => {
    // Arrange
    const workletRuntime = createWorkletRuntime({ name: 'test' });
    const synchronizable = createSynchronizable(0);

    const onJSCallback = () => {
      notify(NOTIFICATION_NAME);
    };

    // Act
    // TODO: Replace with `runOnRuntimeAsync`.
    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      // heavy computation
      new Array(50_000_000).map((_v, i) => i ** 2);
      synchronizable.setBlocking(100);
      scheduleOnRN(onJSCallback);
    });

    const result = runOnRuntimeSync(workletRuntime, () => {
      'worklet';
      return 100;
    });

    // Assert
    expect(result).toBe(100, ComparisonMode.NUMBER);
    await waitForNotification(NOTIFICATION_NAME);
    expect(synchronizable.getBlocking()).toBe(100, ComparisonMode.NUMBER);
  });
});
