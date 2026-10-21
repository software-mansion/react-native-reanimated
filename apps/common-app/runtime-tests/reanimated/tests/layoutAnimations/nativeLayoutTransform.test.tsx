/*
 * Each test that plays a case (`playCase`, or `play` with `expectReference`) has the method of the suite
 * `native layout reference`, each box on its own clock: each sample of the `Transform` target of the native
 * box has the 16 cells of the matrix of the declared values of its operations at one time of the 18 ms
 * before the sample, from the origin of its command (statement A); each frame of the frame-driven
 * twin and of the frame driver on the native box is on a replay of the declared timeline at its frame time
 * (statement B); at the end the native box shows its model and the twin has the same model. A check of a
 * playback key count or of a model value in such a test is for each row, by the time of the row against
 * the times of the trace and the declared times. A spring has no declared timeline: its frames on the
 * native box are the frames of the twin. Each other test has state checks, trace checks, and checks of the
 * two boxes at rest. The tolerance of a cell is 0.005, and a translation has it too.
 *
 * Each test in which the frame driver takes the `Transform` track of the native box has statement M: the
 * model of each read of the native box, from the mount of the first frame update to the last frame of the
 * frame driver, is the matrix of the last recorded frame at or before the read, of the frame before it, or
 * of the first frame after the read whose recorded time is at most one display frame and the clock
 * uncertainty after the read. A cell is equal to 0.0001 and a translation to 0.01. Statement M permits a lag
 * of one recorded frame and gives no limit of the age of the model on the wall clock. Two frames whose
 * matrices are equal in these tolerances cannot say which write gave the value. Other display rates are not
 * tested.
 *
 * The method does not prove: the distance of the two boxes at one instant, the lag of the frame driver,
 * that the two starts are in one display frame, when a callback comes, that a row comes in each part of a
 * timeline, a native value in the first display frame after its origin to better than one display frame, a
 * read in the first 18 ms of a track (its operations start at the initial values of the builder, which the
 * view did not show). After a commit of another style transform, a read from 1.78 ms before the declared
 * end of the track is not checked: it can show the committed style. The pixels on screen, the order in
 * which the screen shows the operations, a device, and 120 Hz are not tested.
 *
 * Statement A has the edge hold of `native layout reference`. Within the read band, this suite cannot
 * distinguish the platform hold from a native segment that keeps its start value through eased progress
 * 0.001 or shows its end value from eased progress 0.999. The frame-driven twin keeps its exact curve check
 * without a hold allowance.
 *
 * The suite `native layout live clock` has the wall-clock statements for the cases of this suite in
 * `nativeLayoutLiveClockCases.ts`: the pair of the two boxes at one instant, the gap of the two end
 * callbacks, and a row of the native box in each phase.
 *
 * The tests of the synchronous props path need the static flag `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS`: the
 * default build does not run them. An animated style gives each box its transform, and each test plays a
 * case with a write of the two animated styles. The model of the native box is a state check for each read.
 * The test of a write between a commit and its mount prints the order that its reads show as a
 * `WRITE-ORDER` row and asserts the statements of that order. It has no load switch, so it does not assert
 * the order `before the mount`: a case of `native layout live clock` does. The reads cannot show a write in
 * the interval before the first read.
 *
 * The tests of `native layout transform forms against the frame driver` need the view sampler of the
 * Android test host. At each draw it maps the four corners of each box through the drawn matrix of the
 * view. Each test compares the native box with its frame-driven twin in the same draw, at each progress
 * of the iOS pixel table from the origin of the native track. Pixels and the alignment of the two starts
 * are not tested.
 */

import { View } from 'react-native';
import { Easing, withSequence, withTiming } from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { TraceEvent } from './nativeLayoutTestKit';
import {
  appleSample,
  Box,
  BOX_REF,
  FRAME_BOX_REF,
  HAS_EDGE_ANTIALIASING,
  hasNativeLayoutRoute,
  mountScene,
  styles,
  takeTraceOf,
} from './nativeLayoutTestKit';

const START_LEFT = 60;

const pairTags = () =>
  [BOX_REF, FRAME_BOX_REF].map((ref) => getTestComponent(ref).getTag());

const FLAG_DURATION = 900;
const FLAG_READ_MS = 300;
const HELD_OPACITY = 0.4;

type ExitOperation = [
  kind: string,
  from: number | string,
  ...phaseEnds: (number | string)[],
];
type Exit = {
  operations: ExitOperation[];
  /** The time of all the phases of an operation. */
  durationMs: number;
  /** The exit has an opacity leaf of this time. */
  opacityMs?: number;
};

/** A callback on each operation keeps the exit frame-driven. */
const exitOf =
  ({ operations, durationMs, opacityMs }: Exit, isFrameDriven: boolean) =>
  () => {
    'worklet';
    const timingOf = <TValue extends number | string>(
      toValue: TValue,
      duration: number
    ) =>
      withTiming(
        toValue,
        { duration, easing: Easing.linear },
        isFrameDriven
          ? () => {
              'worklet';
            }
          : undefined
      );
    const hasOpacity = opacityMs !== undefined;
    return {
      initialValues: {
        transform: operations.map(([kind, from]) => ({ [kind]: from })),
        ...(hasOpacity && { opacity: 1 }),
      },
      animations: {
        transform: operations.map(([kind, , ...phaseEnds]) => ({
          [kind]: withSequence(
            ...phaseEnds.map((phaseEnd) =>
              timingOf(phaseEnd, durationMs / phaseEnds.length)
            )
          ),
        })),
        ...(hasOpacity && { opacity: timingOf(HELD_OPACITY, opacityMs) }),
      },
    };
  };

type ExitPairProps = { exit: Exit; isMounted: boolean };

function ExitPair({ exit, isMounted }: ExitPairProps) {
  return (
    <View style={styles.container}>
      {isMounted && <Box left={START_LEFT} exiting={exitOf(exit, false)} />}
      {isMounted && (
        <Box
          left={START_LEFT}
          exiting={exitOf(exit, true)}
          refName={FRAME_BOX_REF}
        />
      )}
    </View>
  );
}

/** The edge antialiasing of the native box and of its frame-driven twin. */
async function edgeAntialiasingAt(
  tags: number[],
  elapsedMs: number,
  startMs: number
) {
  await wait(Math.max(0, startMs + elapsedMs - performance.now()));
  const samples = await Promise.all(
    tags.map((tag) => appleSample(tag, 'Transform'))
  );
  return samples.map(({ edgeAntialiasing }) => edgeAntialiasing).join();
}

const hasTransformTrack = (events: TraceEvent[]) =>
  events.some(
    ({ event, target }) => event === 'TrackStarted' && target === 'Transform'
  );

describe('native layout transform and the edge antialiasing of the view', () => {
  if (!hasNativeLayoutRoute || !HAS_EDGE_ANTIALIASING) {
    return;
  }

  test('an exit with a perspective: the view and its frame-driven twin have edge antialiasing during the track', async () => {
    const exit: Exit = {
      operations: [
        ['perspective', 500, 500],
        ['rotateX', '0deg', '60deg'],
      ],
      durationMs: FLAG_DURATION,
    };
    const tag = await mountScene(<ExitPair exit={exit} isMounted />);
    const tags = pairTags();
    const start = performance.now();
    await render(<ExitPair exit={exit} isMounted={false} />);
    expect(await edgeAntialiasingAt(tags, FLAG_READ_MS, start)).toBe(
      'true,true'
    );
    expect(hasTransformTrack(await takeTraceOf(tag))).toBe(true);
    await wait(FLAG_DURATION);
    await render(null);
  });
});
