import { createWorkletRuntime, scheduleOnRuntime, scheduleOnUI, scheduleOnRN } from 'react-native-worklets';
import { describe, expect, test, waitForNotification, notify } from '../../ReJest/RuntimeTestsApi';

const NOTIFICATION_NAME = 'NOTIFICATION_NAME';

describe('scheduleOnRN', () => {
  test('should schedule a function on the RN runtime from UI', async () => {
    // Arrange
    let value = 0;
    const callback = (num: number) => {
      value = num;
      notify(NOTIFICATION_NAME);
    };

    // Act
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRN(callback, 100);
    });

    // Assert
    await waitForNotification(NOTIFICATION_NAME);
    expect(value).toBe(100);
  });

  test('should schedule a function on the RN runtime from JS', async () => {
    // Arrange
    let value = 0;
    const callback = (num: number) => {
      value = num;
      notify(NOTIFICATION_NAME);
    };

    // Act
    scheduleOnRN(callback, 100);

    // Assert
    await waitForNotification(NOTIFICATION_NAME);
    expect(value).toBe(100);
  });

  test('should schedule a function on the RN runtime from workletRuntime', async () => {
    // Arrange
    let value = 0;
    const callback = (num: number) => {
      value = num;
      notify(NOTIFICATION_NAME);
    };
    const workletRuntime = createWorkletRuntime();

    // Act
    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      scheduleOnRN(callback, 100);
    });

    // Assert
    await waitForNotification(NOTIFICATION_NAME);
    expect(value).toBe(100);
  });
});
