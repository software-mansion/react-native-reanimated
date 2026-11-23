import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

import {
  describe,
  expect,
  notify,
  test,
  waitForNotification,
  waitForNotifications,
} from '../../../ReJest/RuntimeTestsApi';

const FRAMES = 20;

describe('Test requestAnimationFrame with enableVSync', () => {
  test('ignores animationQueuePollingRate', async () => {
    // Arrange
    const notification = 'vsyncCallback';
    const runtime = createWorkletRuntime({
      name: 'vsync',
      enableVSync: true,
      animationQueuePollingRate: 60_000,
    });
    let elapsed = Infinity;
    const onFrame = (value: number) => {
      elapsed = value;
      notify(notification);
    };

    // Act
    scheduleOnRuntime(runtime, () => {
      'worklet';
      const start = performance.now();
      requestAnimationFrame(() => {
        scheduleOnRN(onFrame, performance.now() - start);
      });
    });
    await waitForNotification(notification);

    // Assert
    expect(elapsed < 1000).toBe(true);
  });

  test('passes one timestamp per frame and a later one to the next frame', async () => {
    // Arrange
    const notification = 'vsyncTimestamps';
    const runtime = createWorkletRuntime({ name: 'vsync', enableVSync: true });
    let timestamps: number[] = [];
    const onDone = (values: number[]) => {
      timestamps = values;
      notify(notification);
    };

    // Act
    scheduleOnRuntime(runtime, () => {
      'worklet';
      const values: number[] = [];
      requestAnimationFrame((first) => {
        values.push(first);
        requestAnimationFrame((third) => {
          values.push(third);
          scheduleOnRN(onDone, values);
        });
      });
      requestAnimationFrame((second) => {
        values.push(second);
      });
    });
    await waitForNotification(notification);

    // Assert
    expect(timestamps.length).toBe(3);
    expect(timestamps[0]).toBe(timestamps[1]);
    expect(timestamps[2] > timestamps[1]).toBe(true);
  });

  test('skips a cancelled callback', async () => {
    // Arrange
    const notification = 'vsyncCancel';
    const runtime = createWorkletRuntime({ name: 'vsync', enableVSync: true });
    let cancelledRan = true;
    const onDone = (value: boolean) => {
      cancelledRan = value;
      notify(notification);
    };

    // Act
    scheduleOnRuntime(runtime, () => {
      'worklet';
      let ran = false;
      const handle = requestAnimationFrame(() => {
        ran = true;
      });
      requestAnimationFrame(() => {
        scheduleOnRN(onDone, ran);
      });
      cancelAnimationFrame(handle);
    });
    await waitForNotification(notification);

    // Assert
    expect(cancelledRan).toBe(false);
  });

  test('receives the frame timestamps of the UI Runtime', async () => {
    // Arrange
    const [workerNotification, uiNotification] = ['vsyncWorker', 'vsyncUI'];
    const runtime = createWorkletRuntime({ name: 'vsync', enableVSync: true });
    let workerTimestamps: number[] = [];
    let uiTimestamps: number[] = [];
    const onWorkerDone = (values: number[]) => {
      workerTimestamps = values;
      notify(workerNotification);
    };
    const onUIDone = (values: number[]) => {
      uiTimestamps = values;
      notify(uiNotification);
    };
    const collectFrames = (onDone: (values: number[]) => void) => {
      'worklet';
      const values: number[] = [];
      const onFrame = (timestamp: number) => {
        values.push(timestamp);
        if (values.length < FRAMES) {
          requestAnimationFrame(onFrame);
        } else {
          scheduleOnRN(onDone, values);
        }
      };
      requestAnimationFrame(onFrame);
    };

    // Act
    scheduleOnUI(collectFrames, onUIDone);
    scheduleOnRuntime(runtime, collectFrames, onWorkerDone);
    await waitForNotifications([workerNotification, uiNotification]);

    // Assert
    const shared = workerTimestamps.filter((timestamp) =>
      uiTimestamps.includes(timestamp)
    );
    expect(workerTimestamps.length).toBe(FRAMES);
    expect(shared.length > 0).toBe(true);
  });
});
