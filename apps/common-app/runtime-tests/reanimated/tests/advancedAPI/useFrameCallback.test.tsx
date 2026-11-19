import { StyleSheet, View } from 'react-native';
import type {
  FrameCallback,
  FrameInfo,
  SharedValue,
} from 'react-native-reanimated';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  getSharedValue,
  registerValue,
  render,
  test,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { DEFAULT_TIMEOUT_MS, withTimeout } from '../../../ReJest/utils/waitFor';

const FIRST = 'FRAME_CALLBACK_FIRST';
const SECOND = 'FRAME_CALLBACK_SECOND';

const COUNT = 'COUNT';
const FIRST_FRAMES = 'FIRST_FRAMES';
const VIOLATIONS = 'VIOLATIONS';
const LAST_STEP = 'LAST_STEP';
const DELTA_SUM = 'DELTA_SUM';
const TIME_SINCE_FIRST_FRAME = 'TIME_SINCE_FIRST_FRAME';

// Long enough to see a doubled frame loop or a callback that did not stop.
const MEASURED_FRAMES = 10;
// Lets an autostarted callback get past its first frame.
const WARM_UP_FRAMES = 5;
// Same as ComparisonMode.FLOAT_DISTANCE. The sum of a few dozen float deltas
// stays far below it.
const DELTA_SUM_TOLERANCE = 1e-5;

let frameCallbacks: Record<string, FrameCallback> = {};
let counts: Record<string, SharedValue<number>> = {};

function valueName(probe: string, key: string) {
  return `${probe}_${key}`;
}

function readValue(probe: string, key: string) {
  return getSharedValue<number>(valueName(probe, key));
}

function getFrameCallback(probe: string) {
  const frameCallback = frameCallbacks[probe];
  if (!frameCallback) {
    throw new Error(`Frame callback ${probe} was not rendered`);
  }
  return frameCallback;
}

type ProbeProps = {
  name: string;
  autostart: boolean;
  step: number;
};

// VIOLATIONS counts inconsistent FrameInfo and second calls within one frame
// (a leaked registration or a second loop), and frames on which DELTA_SUM
// differs from timeSinceFirstFrame, so that two wrong deltas cannot cancel out.
function Probe({ name, autostart, step }: ProbeProps) {
  const count = useSharedValue(0);
  const firstFrames = useSharedValue(0);
  const violations = useSharedValue(0);
  const lastStep = useSharedValue(0);
  const lastTimestamp = useSharedValue(-1);
  const lastTimeSinceFirstFrame = useSharedValue(-1);
  const deltaSum = useSharedValue(0);
  registerValue(valueName(name, COUNT), count);
  registerValue(valueName(name, FIRST_FRAMES), firstFrames);
  registerValue(valueName(name, VIOLATIONS), violations);
  registerValue(valueName(name, LAST_STEP), lastStep);
  registerValue(valueName(name, DELTA_SUM), deltaSum);
  registerValue(
    valueName(name, TIME_SINCE_FIRST_FRAME),
    lastTimeSinceFirstFrame
  );

  const frameCallback = useFrameCallback(
    ({ timestamp, timeSincePreviousFrame, timeSinceFirstFrame }: FrameInfo) => {
      count.value += 1;
      if (timestamp === lastTimestamp.value) {
        violations.value += 1;
      }
      if (timeSincePreviousFrame === null) {
        firstFrames.value += 1;
        deltaSum.value = 0;
        if (timeSinceFirstFrame !== 0) {
          violations.value += 1;
        }
      } else if (
        timeSincePreviousFrame <= 0 ||
        timeSinceFirstFrame <= lastTimeSinceFirstFrame.value
      ) {
        violations.value += 1;
      }
      if (timeSincePreviousFrame !== null) {
        deltaSum.value += timeSincePreviousFrame;
      }
      if (
        Math.abs(deltaSum.value - timeSinceFirstFrame) > DELTA_SUM_TOLERANCE
      ) {
        violations.value += 1;
      }
      lastTimestamp.value = timestamp;
      lastTimeSinceFirstFrame.value = timeSinceFirstFrame;
      lastStep.value = step;
    },
    autostart
  );
  frameCallbacks[name] = frameCallback;
  counts[name] = count;

  return null;
}

function Scenario({
  autostart,
  step = 1,
  withSecond = false,
}: {
  autostart: boolean;
  step?: number;
  withSecond?: boolean;
}) {
  return (
    <View style={styles.container}>
      <Probe name={FIRST} autostart={autostart} step={step} />
      {withSecond && <Probe name={SECOND} autostart={autostart} step={step} />}
    </View>
  );
}

// Counted on the UI runtime: reading from JS would also count the frames of
// the JS-UI round trips. requestAnimationFrame is FIFO and the frame callback
// loop is queued first, so each read sees the call of its own frame.
function countCallsOverFrames(probe: string, frames: number) {
  const count = counts[probe];
  if (!count) {
    throw new Error(`Probe ${probe} was not rendered`);
  }
  const counted = new Promise<number>((resolve) => {
    scheduleOnUI(() => {
      'worklet';
      let start = -1;
      let remaining = frames;
      const onFrame = () => {
        if (start === -1) {
          start = count.value;
        } else {
          remaining -= 1;
        }
        if (remaining > 0) {
          requestAnimationFrame(onFrame);
        } else {
          scheduleOnRN(resolve, count.value - start);
        }
      };
      requestAnimationFrame(onFrame);
    });
  });
  return withTimeout(counted, {
    description: `${frames} frames of ${probe}`,
    timeout: DEFAULT_TIMEOUT_MS,
  });
}

async function expectRunsForEveryFrame(probe: string) {
  expect(await countCallsOverFrames(probe, MEASURED_FRAMES)).toBe(
    MEASURED_FRAMES,
    ComparisonMode.NUMBER
  );
}

async function expectStopped(probe: string) {
  const before = await readValue(probe, COUNT);
  await waitForFrames(MEASURED_FRAMES);
  expect(await readValue(probe, COUNT)).toBe(before, ComparisonMode.NUMBER);
}

async function expectConsistentFrames(probe: string, firstFrames: number) {
  expect(await readValue(probe, FIRST_FRAMES)).toBe(
    firstFrames,
    ComparisonMode.NUMBER
  );
  expect(await readValue(probe, VIOLATIONS)).toBe(0, ComparisonMode.NUMBER);
}

// Call only while the probe is stopped, so both values are from the same frame.
async function expectDeltasAddUp(probe: string) {
  const timeSinceFirstFrame = await readValue(probe, TIME_SINCE_FIRST_FRAME);
  expect(timeSinceFirstFrame).toBeWithinRange(1, Number.MAX_SAFE_INTEGER);
  expect(await readValue(probe, DELTA_SUM)).toBe(
    timeSinceFirstFrame,
    ComparisonMode.FLOAT_DISTANCE
  );
}

// Replaces the manual checks of FrameCallbackExample (#3372, FrameInfo since
// #3455): a callback runs on every frame, it can be started and stopped at any
// moment, two callbacks do not affect each other, and FrameInfo stays
// consistent. Calls and frames are counted on the UI runtime.
describe('useFrameCallback', () => {
  beforeEach(() => {
    frameCallbacks = {};
    counts = {};
  });

  test('a callback with autostart false does not run until setActive(true)', async () => {
    await render(<Scenario autostart={false} />);
    await waitForFrames(MEASURED_FRAMES);
    expect(await readValue(FIRST, COUNT)).toBe(0, ComparisonMode.NUMBER);

    getFrameCallback(FIRST).setActive(true);
    await expectRunsForEveryFrame(FIRST);
    await expectConsistentFrames(FIRST, 1);
  });

  test('setActive(false) stops the callback and setActive(true) starts it with a new first frame', async () => {
    await render(<Scenario autostart />);
    await waitForFrames(WARM_UP_FRAMES);

    getFrameCallback(FIRST).setActive(false);
    await expectStopped(FIRST);

    getFrameCallback(FIRST).setActive(true);
    await expectRunsForEveryFrame(FIRST);
    await expectConsistentFrames(FIRST, 2);
  });

  test('stopping and starting the only callback in one frame keeps a single frame loop', async () => {
    await render(<Scenario autostart />);
    await waitForFrames(WARM_UP_FRAMES);

    getFrameCallback(FIRST).setActive(false);
    getFrameCallback(FIRST).setActive(true);

    await expectRunsForEveryFrame(FIRST);
    await expectConsistentFrames(FIRST, 2);
  });

  test('two callbacks start and stop independently', async () => {
    await render(<Scenario autostart withSecond />);
    await waitForFrames(WARM_UP_FRAMES);

    getFrameCallback(FIRST).setActive(false);
    await expectStopped(FIRST);
    await expectRunsForEveryFrame(SECOND);

    getFrameCallback(FIRST).setActive(true);
    await expectRunsForEveryFrame(FIRST);
    await expectRunsForEveryFrame(SECOND);

    getFrameCallback(SECOND).setActive(false);
    await expectStopped(SECOND);
    await expectRunsForEveryFrame(FIRST);

    await expectConsistentFrames(FIRST, 2);
    await expectConsistentFrames(SECOND, 1);
  });

  test('unmounting the component stops its callback', async () => {
    await render(<Scenario autostart withSecond />);
    await expectRunsForEveryFrame(SECOND);

    await render(<Scenario autostart />);
    await expectStopped(SECOND);
    await expectRunsForEveryFrame(FIRST);
  });

  test('a re-render replaces the callback with the new closure', async () => {
    await render(<Scenario autostart step={1} />);
    await waitForFrames(WARM_UP_FRAMES);
    expect(await readValue(FIRST, LAST_STEP)).toBe(1, ComparisonMode.NUMBER);

    await render(<Scenario autostart step={2} />);
    // A leaked old registration would double the count.
    await expectRunsForEveryFrame(FIRST);
    expect(await readValue(FIRST, LAST_STEP)).toBe(2, ComparisonMode.NUMBER);
    expect(await readValue(FIRST, VIOLATIONS)).toBe(0, ComparisonMode.NUMBER);
  });

  test('a stopped callback stays stopped after a re-render with a new closure', async () => {
    await render(<Scenario autostart step={1} />);
    await waitForFrames(WARM_UP_FRAMES);
    getFrameCallback(FIRST).setActive(false);
    await expectStopped(FIRST);

    await render(<Scenario autostart step={2} />);
    await expectStopped(FIRST);
  });

  test('timeSincePreviousFrame adds up to timeSinceFirstFrame after starts, joins and restarts', async () => {
    await render(<Scenario autostart={false} withSecond />);

    getFrameCallback(FIRST).setActive(true);
    await waitForFrames(MEASURED_FRAMES);
    // SECOND must still be stopped here, so that it joins a running loop.
    expect(await readValue(FIRST, COUNT)).toBeWithinRange(
      1,
      Number.MAX_SAFE_INTEGER
    );
    expect(await readValue(SECOND, COUNT)).toBe(0, ComparisonMode.NUMBER);
    getFrameCallback(SECOND).setActive(true);
    await expectRunsForEveryFrame(FIRST);
    await expectRunsForEveryFrame(SECOND);
    getFrameCallback(FIRST).setActive(false);
    await waitForFrames(MEASURED_FRAMES);
    // The restart resets FIRST's sums, so check the first run now.
    await expectDeltasAddUp(FIRST);
    getFrameCallback(FIRST).setActive(true);
    await waitForFrames(MEASURED_FRAMES);
    getFrameCallback(FIRST).setActive(false);
    getFrameCallback(SECOND).setActive(false);

    await waitForFrames(MEASURED_FRAMES);
    await expectDeltasAddUp(FIRST);
    await expectDeltasAddUp(SECOND);
    await expectConsistentFrames(FIRST, 2);
    await expectConsistentFrames(SECOND, 1);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
