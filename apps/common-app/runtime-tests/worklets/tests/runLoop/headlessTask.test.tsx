import { AppRegistry, Platform } from 'react-native';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  afterEach,
  describe,
  expect,
  test,
} from '../../../ReJest/RuntimeTestsApi';

type UICallbackName = 'requestAnimationFrame' | 'setTimeout';
type FiredUICallbacks = Record<UICallbackName, boolean>;

interface HeadlessTask {
  finish: () => Promise<void>;
}

interface UICallbacksWatch {
  snapshot: () => FiredUICallbacks;
  waitForAll: () => Promise<FiredUICallbacks>;
}

const HEADLESS_TASK_KEY = 'RuntimeTestsHeadlessTask';
const UI_CALLBACKS_TIMEOUT_MS = 2000;
const PAUSED_QUEUE_OBSERVATION_MS = 300;

const headlessTaskBodies: (() => Promise<void>)[] = [];
const startedHeadlessTasks: HeadlessTask[] = [];
let isHostPaused = false;

AppRegistry.registerHeadlessTask(HEADLESS_TASK_KEY, () => async () => {
  await headlessTaskBodies.shift()?.();
});

describe('Test headless JS task', () => {
  const androidTest =
    Platform.OS === 'android' && RuntimeTestObserver ? test : test.skip;

  afterEach(async () => {
    for (const task of startedHeadlessTasks.splice(0)) {
      await task.finish();
    }
    if (isHostPaused) {
      await resumeHost();
    }
  });

  androidTest(
    'runs frame callbacks and timers of the UI Runtime in a task that starts while the host is paused',
    async () => {
      await pauseHost();
      await startHeadlessTask();

      const fired = await watchUICallbacks().waitForAll();

      expect(fired.requestAnimationFrame).toBe(true);
      expect(fired.setTimeout).toBe(true);
    }
  );

  androidTest(
    'runs frame callbacks and timers of the UI Runtime when the host pauses during a task',
    async () => {
      await startHeadlessTask();
      await pauseHost();

      const fired = await watchUICallbacks().waitForAll();

      expect(fired.requestAnimationFrame).toBe(true);
      expect(fired.setTimeout).toBe(true);
    }
  );

  androidTest(
    'runs frame callbacks and timers of the UI Runtime after one of two overlapping tasks finishes',
    async () => {
      await pauseHost();
      const firstTask = await startHeadlessTask();
      await startHeadlessTask();
      await firstTask.finish();

      const fired = await watchUICallbacks().waitForAll();

      expect(fired.requestAnimationFrame).toBe(true);
      expect(fired.setTimeout).toBe(true);
    }
  );

  androidTest(
    'holds frame callbacks and timers of the UI Runtime after the last task finishes, until the host resumes',
    async () => {
      await pauseHost();
      const task = await startHeadlessTask();
      await task.finish();

      const watch = watchUICallbacks();
      await RuntimeTestObserver!.delay(PAUSED_QUEUE_OBSERVATION_MS);
      const firedWhilePaused = watch.snapshot();
      await resumeHost();
      const firedAfterResume = await watch.waitForAll();

      expect(firedWhilePaused.requestAnimationFrame).toBe(false);
      expect(firedWhilePaused.setTimeout).toBe(false);
      expect(firedAfterResume.requestAnimationFrame).toBe(true);
      expect(firedAfterResume.setTimeout).toBe(true);
    }
  );
});

async function pauseHost() {
  await RuntimeTestObserver!.pauseHost();
  isHostPaused = true;
}

async function resumeHost() {
  await RuntimeTestObserver!.resumeHost();
  isHostPaused = false;
}

async function startHeadlessTask(): Promise<HeadlessTask> {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  headlessTaskBodies.push(() => released);
  const taskId =
    await RuntimeTestObserver!.startHeadlessTask(HEADLESS_TASK_KEY);

  let finished: Promise<void> | null = null;
  const task: HeadlessTask = {
    finish: () => {
      if (finished === null) {
        release();
        finished = RuntimeTestObserver!.waitForHeadlessTaskFinish(taskId);
      }
      return finished;
    },
  };
  startedHeadlessTasks.push(task);
  return task;
}

function watchUICallbacks(): UICallbacksWatch {
  const fired: FiredUICallbacks = {
    requestAnimationFrame: false,
    setTimeout: false,
  };
  let onAllFired = () => {};
  const allFired = new Promise<void>((resolve) => {
    onAllFired = resolve;
  });
  const onFired = (name: UICallbackName) => {
    fired[name] = true;
    if (fired.requestAnimationFrame && fired.setTimeout) {
      onAllFired();
    }
  };

  scheduleOnUI(() => {
    'worklet';
    requestAnimationFrame(() => scheduleOnRN(onFired, 'requestAnimationFrame'));
    setTimeout(() => scheduleOnRN(onFired, 'setTimeout'), 50);
  });

  return {
    snapshot: () => ({ ...fired }),
    waitForAll: async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, UI_CALLBACKS_TIMEOUT_MS);
      });
      await Promise.race([allFired, deadline]);
      clearTimeout(timeout);
      return { ...fired };
    },
  };
}
