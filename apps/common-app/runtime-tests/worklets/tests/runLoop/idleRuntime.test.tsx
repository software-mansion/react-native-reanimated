import { runOnUISync, scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  notify,
  test,
  wait,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const IDLE_MS = 200;

describe('work queued on an idle UI Runtime', () => {
  test('runs a requestAnimationFrame callback', async () => {
    const onDone = () => notify('callback');
    await wait(IDLE_MS);

    scheduleOnUI(() => {
      'worklet';
      requestAnimationFrame(() => {
        scheduleOnRN(onDone);
      });
    });

    await waitForNotification('callback');
  });

  test('runs a frame finalizer', async () => {
    const onDone = () => notify('finalizer');
    await wait(IDLE_MS);

    scheduleOnUI(() => {
      'worklet';
      globalThis.requestAnimationFrameFinalizer(() => {
        scheduleOnRN(onDone);
      });
    });

    await waitForNotification('finalizer');
  });

  test('runs a setTimeout callback', async () => {
    const onDone = () => notify('timeout');
    await wait(IDLE_MS);

    scheduleOnUI(() => {
      'worklet';
      setTimeout(() => {
        scheduleOnRN(onDone);
      }, 50);
    });

    await waitForNotification('timeout');
  });

  test('runs a microtask queued by a frame finalizer', async () => {
    const onDone = () => notify('microtask');
    await wait(IDLE_MS);

    scheduleOnUI(() => {
      'worklet';
      globalThis.requestAnimationFrameFinalizer(() => {
        queueMicrotask(() => {
          scheduleOnRN(onDone);
        });
      });
    });

    await waitForNotification('microtask');
  });

  test('runs a microtask queued by a synchronous call from the RN Runtime', async () => {
    const onDone = () => notify('microtask');
    await wait(IDLE_MS);

    runOnUISync(() => {
      'worklet';
      queueMicrotask(() => {
        scheduleOnRN(onDone);
      });
    });

    await waitForNotification('microtask');
  });

  test('runs a promise reaction queued by a synchronous call from the RN Runtime', async () => {
    const onDone = () => notify('promise');
    await wait(IDLE_MS);

    runOnUISync(() => {
      'worklet';
      void Promise.resolve().then(() => {
        scheduleOnRN(onDone);
      });
    });

    await waitForNotification('promise');
  });

  test('runs a promise reaction queued by a scheduled worklet', async () => {
    const onDone = () => notify('promise');
    await wait(IDLE_MS);

    scheduleOnUI(() => {
      'worklet';
      void Promise.resolve().then(() => {
        scheduleOnRN(onDone);
      });
    });

    await waitForNotification('promise');
  });

  test('runs every frame of a chain of requestAnimationFrame callbacks once', async () => {
    const FRAME_COUNT = 10;
    let timestamps: number[] = [];
    const onDone = (recorded: number[]) => {
      timestamps = recorded;
      notify('frames');
    };
    await wait(IDLE_MS);

    scheduleOnUI(() => {
      'worklet';
      const recorded: number[] = [];
      const onFrame = (timestamp: number) => {
        recorded.push(timestamp);
        if (recorded.length < FRAME_COUNT) {
          requestAnimationFrame(onFrame);
        } else {
          scheduleOnRN(onDone, recorded);
        }
      };
      requestAnimationFrame(onFrame);
    });

    await waitForNotification('frames');
    expect(timestamps.length).toBe(FRAME_COUNT);
    expect(new Set(timestamps).size).toBe(FRAME_COUNT);
  });
});
