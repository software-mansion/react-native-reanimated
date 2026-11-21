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
  Box,
  BOX_REF,
  FRAME_BOX_REF,
  hasNativeLayoutStarts,
  mountScene,
  sample,
  styles,
  takeTraceOf,
  transformItemOf,
} from './nativeLayoutTestKit';

const START_LEFT = 60;

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
        transform: operations.map(([kind, from]) =>
          transformItemOf(kind, from)
        ),
        ...(hasOpacity && { opacity: 1 }),
      },
      animations: {
        transform: operations.map(([kind, , ...phaseEnds]) =>
          transformItemOf(
            kind,
            withSequence(
              ...phaseEnds.map((phaseEnd) =>
                timingOf(phaseEnd, durationMs / phaseEnds.length)
              )
            )
          )
        ),
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

const pairTags = () =>
  [BOX_REF, FRAME_BOX_REF].map((ref) => getTestComponent(ref).getTag());

/** The edge antialiasing of the native box and of its frame-driven twin. */
async function edgeAntialiasingAt(
  tags: number[],
  elapsedMs: number,
  startMs: number
) {
  await wait(Math.max(0, startMs + elapsedMs - performance.now()));
  const samples = await Promise.all(
    tags.map((tag) => sample(tag, 'Transform'))
  );
  return samples.map(({ edgeAntialiasing }) => edgeAntialiasing).join();
}

const hasTransformTrack = (events: TraceEvent[]) =>
  events.some(
    ({ event, target }) => event === 'TrackStarted' && target === 'Transform'
  );

describe('native layout transform and the edge antialiasing of the view', () => {
  if (!hasNativeLayoutStarts) {
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
