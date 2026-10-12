import { makeMutable, withRepeat, withTiming } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import type { ScenarioStep } from './LifecycleApi';
import { phase, reload, scenario } from './LifecycleApi';

const ANIMATION_TIMEOUT_MS = 5000;

const UI_BATCH_MS = 100;
const WORKLET_MS = 0.5;
// Long enough for the next batch to start, and shorter than a batch.
const JS_HOLD_MS = 30;
// The reload normally ends the loop much earlier.
const GIVE_UP_AFTER_MS = 20_000;

function busyWait(ms: number) {
  'worklet';
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // Spin.
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Passes only if the frame callbacks and the animation clock work. */
async function expectAnimationToFinish() {
  const sv = makeMutable(0);
  sv.value = withTiming(1, { duration: 200 });
  const deadline = performance.now() + ANIMATION_TIMEOUT_MS;
  while (sv.value !== 1) {
    if (performance.now() > deadline) {
      throw new Error(
        `The animation did not finish in ${ANIMATION_TIMEOUT_MS} ms, the value is ${sv.value}.`
      );
    }
    await sleep(50);
  }
}

function startRepeatingAnimation() {
  const sv = makeMutable(0);
  sv.value = withRepeat(withTiming(1, { duration: 300 }), -1, true);
}

/**
 * Keeps the UI thread busy with worklets that start animations until the
 * instance is torn down (or for `GIVE_UP_AFTER_MS`), so that it is in the
 * middle of a batch when React Native invalidates the native modules.
 *
 * Every batch asks the JS thread to schedule the next one. That makes each
 * batch a separate task on the UI thread, so the steps of the reload that run
 * there get their turn in between. A timer would not do, because JS timers stop
 * when the reload pauses the host.
 *
 * React Native invalidates the modules right after the last of those steps and
 * after the JS thread has finished its current task. `holdJSThread` makes that
 * task long enough for the next batch to start first.
 */
function keepStartingAnimationsOnUI() {
  const sv = makeMutable(0);
  const deadline = performance.now() + GIVE_UP_AFTER_MS;

  function scheduleUIBatch() {
    if (performance.now() < deadline) {
      scheduleOnUI(runUIBatch);
    }
  }

  function holdJSThread() {
    busyWait(JS_HOLD_MS);
  }

  function runUIBatch() {
    'worklet';
    for (let i = 0; i < UI_BATCH_MS / WORKLET_MS; i++) {
      busyWait(WORKLET_MS);
      sv.value = withTiming(Math.random(), { duration: 100 });
    }
    scheduleOnRN(scheduleUIBatch);
    scheduleOnRN(holdJSThread);
  }

  scheduleUIBatch();
}

function scenarioInBothInvalidationOrders(name: string, steps: ScenarioStep[]) {
  scenario(`${name} (Worklets invalidated first)`, steps, {
    invalidateFirst: 'worklets',
  });
  scenario(`${name} (Reanimated invalidated first)`, steps, {
    invalidateFirst: 'reanimated',
  });
}

scenarioInBothInvalidationOrders('reload while idle', [
  // Without this nothing would request the native modules before the reload,
  // and there would be nothing to invalidate.
  phase('initialize Reanimated', () => {
    makeMutable(0);
  }),
  reload(),
  phase('animations work', expectAnimationToFinish),
]);

scenarioInBothInvalidationOrders('reload during an animation', [
  phase('start a repeating animation', startRepeatingAnimation),
  reload(),
  phase('animations work', expectAnimationToFinish),
]);

scenarioInBothInvalidationOrders('reload while worklets start animations', [
  phase('keep starting animations on the UI thread', () => {
    keepStartingAnimationsOnUI();
  }),
  reload(),
  phase('animations work', expectAnimationToFinish),
]);
