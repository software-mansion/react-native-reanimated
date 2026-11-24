import {
  abortWorkletRuntime,
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
  wait,
  waitForNotification,
  waitForNotifications,
} from '../../../ReJest/RuntimeTestsApi';

const FRAMES = 20;
const RATE_WINDOW_MS = 1000;
const MIN_RATE_RATIO = 0.9;
const UI_BLOCK_MS = 500;
const ABORT_SETTLE_MS = 500;
const MAX_FRAMES_IN_FLIGHT = 2;
const MIN_FRAMES_DURING_UI_BLOCK = 5;

type WorkletRuntimeConfig = Parameters<typeof createWorkletRuntime>[0];

describe('Test requestAnimationFrame with enableVSync', () => {
  test('throws when animationQueuePollingRate is also set', async () => {
    // Arrange
    const config = {
      name: 'vsync',
      enableVSync: true,
      animationQueuePollingRate: 16,
    } as unknown as WorkletRuntimeConfig;

    // Act & Assert
    await expect(() => {
      createWorkletRuntime(config);
    }).toThrow('`animationQueuePollingRate` option cannot be set');
  });

  test.each([
    ['the Event Loop is disabled', { enableEventLoop: false }],
    ['locking is disabled', { enableLocking: false }],
    ['the runtime has no queue', { queue: null }],
    ['the runtime has a custom queue', { queue: {} }],
  ] as const)('throws when %s', async ([_description, overrides]) => {
    // Arrange
    const config = {
      name: 'vsync',
      enableVSync: true,
      ...overrides,
    } as unknown as WorkletRuntimeConfig;

    // Act & Assert
    await expect(() => {
      createWorkletRuntime(config);
    }).toThrow('requires the default queue and the Event Loop');
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

  test('runs callbacks at the frame rate of the UI Runtime', async () => {
    // Arrange
    const [workerNotification, uiNotification] = [
      'vsyncWorkerRate',
      'vsyncUIRate',
    ];
    const runtime = createWorkletRuntime({ name: 'vsync', enableVSync: true });
    let workerFrames = 0;
    let uiFrames = 0;
    const onWorkerDone = (frames: number) => {
      workerFrames = frames;
      notify(workerNotification);
    };
    const onUIDone = (frames: number) => {
      uiFrames = frames;
      notify(uiNotification);
    };
    const countFrames = (onDone: (frames: number) => void) => {
      'worklet';
      let frames = 0;
      const start = performance.now();
      const onFrame = () => {
        frames++;
        if (performance.now() - start < RATE_WINDOW_MS) {
          requestAnimationFrame(onFrame);
        } else {
          scheduleOnRN(onDone, frames);
        }
      };
      requestAnimationFrame(onFrame);
    };

    // Act
    scheduleOnUI(countFrames, onUIDone);
    scheduleOnRuntime(runtime, countFrames, onWorkerDone);
    await waitForNotifications([workerNotification, uiNotification]);

    // Assert
    expect(uiFrames > 0).toBe(true);
    expect(workerFrames >= uiFrames * MIN_RATE_RATIO).toBe(true);
    expect(workerFrames <= uiFrames + 1).toBe(true);
  });

  test('runs callbacks while the UI thread is blocked', async () => {
    // Arrange
    const [readyNotification, uiNotification, workerNotification] = [
      'vsyncWorkerReady',
      'vsyncUIBlocked',
      'vsyncWorkerUnblocked',
    ];
    const runtime = createWorkletRuntime({ name: 'vsync', enableVSync: true });
    let workerCallbackTimes: number[] = [];
    let blockStart = 0;
    let blockEnd = 0;
    const onWorkerReady = () => {
      notify(readyNotification);
    };
    const onWorkerDone = (times: number[]) => {
      workerCallbackTimes = times;
      notify(workerNotification);
    };
    const onUIDone = (start: number, end: number) => {
      blockStart = start;
      blockEnd = end;
      notify(uiNotification);
    };

    // Act
    scheduleOnRuntime(runtime, () => {
      'worklet';
      const globals = globalThis as unknown as { __vsyncTestStop?: boolean };
      const times: number[] = [];
      const onFrame = () => {
        times.push(performance.now());
        if (times.length === 1) {
          scheduleOnRN(onWorkerReady);
        }
        if (globals.__vsyncTestStop) {
          scheduleOnRN(onWorkerDone, times);
        } else {
          requestAnimationFrame(onFrame);
        }
      };
      requestAnimationFrame(onFrame);
    });
    await waitForNotification(readyNotification);
    scheduleOnUI(() => {
      'worklet';
      const start = performance.now();
      while (performance.now() - start < UI_BLOCK_MS) {
        /** Busy wait. */
      }
      scheduleOnRN(onUIDone, start, performance.now());
    });
    await waitForNotification(uiNotification);
    scheduleOnRuntime(runtime, () => {
      'worklet';
      (globalThis as unknown as { __vsyncTestStop?: boolean }).__vsyncTestStop =
        true;
    });
    await waitForNotification(workerNotification);

    // Assert
    const duringBlock = workerCallbackTimes.filter(
      (time) => time > blockStart && time < blockEnd
    );
    expect(blockEnd - blockStart >= UI_BLOCK_MS).toBe(true);
    expect(duringBlock.length >= MIN_FRAMES_DURING_UI_BLOCK).toBe(true);
  });

  test('runs callbacks on two runtimes at the same time', async () => {
    // Arrange
    const notifications = ['vsyncFirst', 'vsyncSecond', 'vsyncUIPair'];
    const runtimes = [
      createWorkletRuntime({ name: 'vsync1', enableVSync: true }),
      createWorkletRuntime({ name: 'vsync2', enableVSync: true }),
    ];
    const frames = [0, 0, 0];
    const makeOnDone = (index: number) => (value: number) => {
      frames[index] = value;
      notify(notifications[index]);
    };
    const countFrames = (onDone: (frames: number) => void) => {
      'worklet';
      let count = 0;
      const start = performance.now();
      const onFrame = () => {
        count++;
        if (performance.now() - start < RATE_WINDOW_MS) {
          requestAnimationFrame(onFrame);
        } else {
          scheduleOnRN(onDone, count);
        }
      };
      requestAnimationFrame(onFrame);
    };

    // Act
    scheduleOnUI(countFrames, makeOnDone(2));
    scheduleOnRuntime(runtimes[0], countFrames, makeOnDone(0));
    scheduleOnRuntime(runtimes[1], countFrames, makeOnDone(1));
    await waitForNotifications(notifications);

    // Assert
    expect(frames[2] > 0).toBe(true);
    expect(frames[0] >= frames[2] * MIN_RATE_RATIO).toBe(true);
    expect(frames[1] >= frames[2] * MIN_RATE_RATIO).toBe(true);
  });

  test('stops running callbacks after abortWorkletRuntime', async () => {
    // Arrange
    const notification = 'vsyncAbortFirstFrame';
    const runtime = createWorkletRuntime({
      name: 'vsync-abort',
      enableVSync: true,
      abortable: true,
    });
    let frames = 0;
    const onFrame = () => {
      frames++;
      if (frames === 1) {
        notify(notification);
      }
    };
    scheduleOnRuntime(runtime, () => {
      'worklet';
      const loop = () => {
        scheduleOnRN(onFrame);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    await waitForNotification(notification);

    // Act
    abortWorkletRuntime(runtime);
    const framesAtAbort = frames;
    await wait(ABORT_SETTLE_MS);

    // Assert
    expect(frames <= framesAtAbort + MAX_FRAMES_IN_FLIGHT).toBe(true);
  });
});
