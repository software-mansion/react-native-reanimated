import { Platform } from 'react-native';
import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
} from 'react-native-worklets';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  afterEach,
  describe,
  expect,
  test,
} from '../../../ReJest/RuntimeTestsApi';

const PAUSED_OBSERVATION_MS = 300;
const CALLBACKS_TIMEOUT_MS = 2000;

let isHostPaused = false;

describe('Test enableVSync while the host is paused', () => {
  const androidTest =
    Platform.OS === 'android' && RuntimeTestObserver ? test : test.skip;

  afterEach(async () => {
    if (isHostPaused) {
      await resumeHost();
    }
  });

  androidTest(
    'holds frame callbacks and setTimeout callbacks until the host resumes',
    async () => {
      // Arrange
      const runtime = createWorkletRuntime({
        name: 'vsync',
        enableVSync: true,
      });
      const watch = watchCallbacks(['requestAnimationFrame', 'setTimeout']);
      const registration = watchCallbacks(['registered']);
      await pauseHost();

      // Act
      scheduleOnRuntime(runtime, () => {
        'worklet';
        requestAnimationFrame(() =>
          scheduleOnRN(watch.onFired, 'requestAnimationFrame')
        );
        setTimeout(() => scheduleOnRN(watch.onFired, 'setTimeout'), 0);
        scheduleOnRN(registration.onFired, 'registered');
      });
      const registered = await registration.waitForAll();
      await RuntimeTestObserver!.delay(PAUSED_OBSERVATION_MS);
      const firedWhilePaused = watch.snapshot();
      await resumeHost();
      const firedAfterResume = await watch.waitForAll();

      // Assert
      expect(registered.registered).toBe(true);
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

function watchCallbacks<TName extends string>(names: TName[]) {
  const fired = Object.fromEntries(
    names.map((name) => [name, false])
  ) as Record<TName, boolean>;
  let onAllFired = () => {};
  const allFired = new Promise<void>((resolve) => {
    onAllFired = resolve;
  });
  return {
    onFired: (name: TName) => {
      fired[name] = true;
      if (names.every((key) => fired[key])) {
        onAllFired();
      }
    },
    snapshot: () => ({ ...fired }),
    waitForAll: async () => {
      await Promise.race([
        allFired,
        RuntimeTestObserver!.delay(CALLBACKS_TIMEOUT_MS),
      ]);
      return { ...fired };
    },
  };
}
