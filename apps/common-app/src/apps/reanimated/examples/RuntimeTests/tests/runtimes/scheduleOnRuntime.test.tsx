import { createSynchronizable, createWorkletRuntime, scheduleOnRN, scheduleOnRuntime } from 'react-native-worklets';
import { describe, expect, test, waitForNotification, notify } from '../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../ReJest/types';

const NOTIFICATION_NAME = 'NOTIFICATION_NAME';

describe('scheduleOnRuntime', () => {
  // For now there is no way to schedule a function on the Worker Runtime from the UI Runtime
  //   test('should schedule a function on the RN runtime from UI', async () => {
  //     // Arrange
  //     const synchronizable = createSynchronizable(0);
  //     const workletRuntime = createWorkletRuntime({ name: 'test' });
  //     const onJSCallback = () => {
  //       notify(NOTIFICATION_NAME);
  //     };

  //     // Act
  //     scheduleOnUI(() => {
  //       'worklet';
  //       scheduleOnRuntime(workletRuntime, () => {
  //         'worklet';
  //         synchronizable.setBlocking(100);
  //         scheduleOnRN(onJSCallback);
  //       });
  //     });

  //     // Assert
  //     await waitForNotify(NOTIFICATION_NAME);
  //   });

  test('should schedule a function on the Worker Runtime from RN Runtime', async () => {
    // Arrange
    const synchronizable = createSynchronizable(0);
    const workletRuntime = createWorkletRuntime({ name: 'test' });

    const onJSCallback = () => {
      notify(NOTIFICATION_NAME);
    };

    // Act
    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      synchronizable.setBlocking(100);
      scheduleOnRN(onJSCallback);
    });

    // Assert
    await waitForNotification(NOTIFICATION_NAME);
    expect(synchronizable.getBlocking()).toBe(100, ComparisonMode.NUMBER);
  });

  // For now there is no way to schedule a function on the Worker Runtime from the other Worker Runtime
  //   test('should schedule a function on the RN runtime from workletRuntime', async () => {
  //     // Arrange
  //     const synchronizable = createSynchronizable(0);
  //     const workletRuntime = createWorkletRuntime({ name: 'test' });
  //     const workletRuntime2 = createWorkletRuntime({ name: 'test2' });

  //     const onJSCallback = () => {
  //       notify(NOTIFICATION_NAME);
  //     };

  //     // Act
  //     scheduleOnRuntime(workletRuntime, () => {
  //       'worklet';

  //       scheduleOnRuntime(workletRuntime2, () => {
  //         'worklet';
  //         synchronizable.setBlocking(200);
  //         scheduleOnRN(onJSCallback);
  //       });
  //     });

  //     // Assert
  //     await waitForNotify(NOTIFICATION_NAME);
  //     expect(synchronizable.getBlocking()).toBe(200, ComparisonMode.NUMBER);
  //   });
});
