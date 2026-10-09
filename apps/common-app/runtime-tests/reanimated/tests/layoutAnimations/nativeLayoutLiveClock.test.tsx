/*
 * The statements that need the wall clock, for the cases of `native layout reference` and for the cases of
 * the other native layout suites in `nativeLayoutLiveClockCases.ts`. A frame-driven phase
 * starts in the first frame at or after the end of the phase before it, so phase number n of the twin
 * starts n display frames or less after its declared start, and a twin of n phases can be n display frames
 * behind its declared timeline with no late frame. The start of a phase is a computed start: the rules of
 * `replayFrames` give it for the frame times of the record. In a timeline whose first phase has no
 * duration, a timing or a delay, a phase can start one display frame or less before its declared start: the
 * start call of a layout animation steps the animation on the clock, the phase ends in that step, the next
 * timing moves its start back to its first frame, which can be before the call, and each later phase
 * follows that start. The size of one display frame is an inference from that code; measured: -0.891 ms.
 * In each other timeline a phase starts at or after its declared start.
 *
 * The pair: at one request step at the time t, the value that the native box shows and the value of its
 * twin differ by the tolerance of the key plus the largest distance between a declared value of the key
 * that the read of the native box can show and a declared value of the key in the frames of the twin:
 *
 *   bound = tolerance + the largest |d(a) - d(b)|, a from t - 18 ms - u to t + u, b from t - n F to t + F
 *
 * d is the declared value of the key at a time, u the uncertainty of the origin of its track, F one
 * display frame, n the count of the started phases of the twin, one at the least. The times a are the band
 * of statement A of `native layout reference`: a presentation value stays 18 ms (`PRESENTATION_STAY_MS`,
 * measured). The read can also show the values of the two other rules of statement A, in the order of that
 * statement: the held values of the edge hold of the animations of the read, then the values of the removal
 * window. A pair that is in its bound only with the held values is an `EDGE-HOLD` row; a pair that is in its
 * bound only with the removal window is a `REMOVAL-WINDOW` row. The declared value of a key is the value of
 * the track that has the key at each time, as in statement A: the replaced track before the `TrackStarted`
 * time of a track that replaced it. A position value is the center of the box. The pair of a `Transform`
 * target is the 16 cells of its matrix: the cells that the native box shows, and the cells of the operation
 * values of the write of the twin that the model of the twin shows, in the product order of the layer of
 * the native sample. The read of the native box has all the operations at one time a, as in statement A.
 * The twin has each operation at a time b of its own, with the started phases of that operation: the bound
 * of a cell has the largest distance over each time a and each choice of the times b. So the pair of a
 * `Transform` target does not assert the common-time relation between the operations of the twin: a change
 * of one operation that cancels a change of another operation in one cell at a common time does not make
 * the bound smaller.
 *
 * So the pair statement does not reject a native value that is up to 18 ms plus u older than the step: on
 * a track of one speed the bound has the travel of 18 ms plus u plus F, or of n F plus u when that is
 * longer. Statement A of `native layout reference` is the strict check of the native box, on its own clock.
 * The pair statement is a record on the wall clock and does not gate. Each test prints the smallest and
 * the largest margin of each pair: the margin is the bound minus the distance of the two boxes. A cell of a
 * `Transform` pair whose bound has no declared change has the margin of its tolerance when the two boxes
 * agree, so the test prints the margins of the cells with a declared change apart.
 *
 * A key that replaces a track on screen has two declared timelines: the native track starts at the value
 * that the route captured from the replaced track at the origin of its build, and the twin starts at the
 * value of its start call at the time of its start call. The bound of its pair has one more term: the
 * distance of these two declared timelines at the step time. The term is zero for each other key. Each
 * pair that is over its bound is a `LIVE` row with its sample times, its two values, the generation and the
 * origin of its track, the playback keys, the two start values, the time of the last frame of the twin
 * at its start call, and each term of its bound.
 *
 * The hand-over window of a track that the frame driver took is from the start call of the frame driver for
 * its key on the native box to 18 ms and the uncertainty of its origin after the end report of the track: a
 * read can show the track to that time. Each request step in it is a `LIVE` row with its sample times, the
 * origin and the generation of the track, the playback keys, the value that the native box shows, its model
 * value, the value of the twin, the pair gap with its bound, and the values that a read of the track can
 * show at the step. The statement of such a row: the native
 * box shows a value of its track by the rule of statement A, or the pair is inside its bound. A row that
 * shows the model value plus the offset of the track is on neither and fails. The row prints the two
 * results apart.
 *
 * The end callback of the native box comes from n + 1 display frames before the callback of a twin of n
 * phases to two display frames after it, on the UI runtime and on the React Native runtime: the sum of the
 * bound of an end report and of the start rule of the twin. A track that plays to its end reports the end
 * from one display frame before to two after its declared end. The first row of a replacement comes in its
 * first three display frames. The frame driver has frames before the end report of a track that it took,
 * measured 0.833 to 3.216 ms before it, and its next frame comes two display frames or less after the end
 * report, measured 8.806 to 11.108 ms in 5 of 5 rows with no load.
 *
 * This suite does not assert that the native box and a twin of several phases end in one display frame: a
 * native sequence that ends 16 to 33 ms before the frame-driven one passes. Each callback gap and each
 * phase start is a printed row.
 *
 * The twin has a frame in each display frame: no frame comes more than one display frame and a half after
 * the frame before it. This statement and the pair statement assert on each row in each condition: no row
 * is skipped.
 *
 * The rows cover the timelines: each phase of 100 ms or more of each track that plays to the end of the
 * phase has a row of the native box. A suite that checks each row that it has at the time of the row, and
 * not at a planned time, has this statement here.
 *
 * A late frame, a late test step, or a late callback fails a statement. The suite is not in the default
 * run. Each test prints each quantity as `LIVE | test | quantity | value` before it asserts it, so the log
 * of a run under a load is a record of the quantities.
 */
import React from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import {
  Easing,
  getStaticFeatureFlag,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import {
  LIVE_CLOCK_CASES,
  transformCaseOf,
} from './nativeLayoutLiveClockCases';
import { blockUIThread } from './nativeLayoutLoad';
import type {
  HandOver,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import {
  expectReference,
  handOversOf,
  isReplaced,
  matrixToleranceOf,
  play,
  REFERENCE_CASES,
  targetsOf,
} from './nativeLayoutReferencePlay';
import type {
  Band,
  MatrixTolerance,
  OperationValue,
  PairChanges,
  PlayedTrack,
  Samples,
  ScalarTrack,
  SizeBoxProps,
  TargetSample,
  Timeline,
} from './nativeLayoutTestKit';
import {
  amountOf,
  BOX_REF,
  callbackTimeOf,
  cellsOf,
  cellToleranceOf,
  checkedTracksOf,
  CSSLoopBox,
  declaredBandOf,
  declaredDurationOf,
  declaredEndOf,
  declaredPairChangeAt,
  declaredStartsOf,
  declaredValueOf,
  describeLeaf,
  END_LEFT,
  FIRST_FRAMES_MS,
  FRAME_BOX_REF,
  FRAME_MS,
  hasNativeLayoutStarts,
  isSameLeaf,
  isScalarTrack,
  LAYOUT_DURATION,
  layerOf,
  layoutOf,
  LOOP_DURATION,
  LOOP_KEYFRAMES,
  middleOf,
  mountScene,
  nativeResidualOf,
  opacities,
  operationPairChangesAt,
  phaseStartsLateOf,
  SAMPLED_OPACITY_TOLERANCE,
  sampleOpacity,
  sampleRows,
  shownTrackOf,
  SizeBox,
  START_LEFT,
  WriterBox,
} from './nativeLayoutTestKit';

// A frame time is equal to the sum of a start and a duration but for the rounding of a number.
const ROUNDING_MS = 1e-6;

const WRITTEN_END = 80;
const WRITTEN_VALUE = 30;
const WRITE_BLOCK_MS = 40;

const offsets: Record<string, SharedValue<number>> = {};

/** A `SizeBox` whose `translateX` an animated style gives. */
function WrittenBox(box: SizeBoxProps) {
  const offset = useSharedValue(WRITTEN_END);
  offsets[box.refName ?? BOX_REF] = offset;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  // oxlint-disable-next-line reanimated/animated-style-non-animated-component -- The host of a `SizeBox` is an animated component.
  return <SizeBox {...box} style={[box.style, animatedStyle]} />;
}

/**
 * A write of the two transforms before the commit, after a block of the UI
 * thread.
 */
const WRITE_BEFORE_MOUNT = transformCaseOf(
  [['translateX', 0, WRITTEN_END]],
  undefined,
  {
    box: { Box: WrittenBox },
    write: {
      targets: ['Transform'],
      run: () => {
        const targets = [offsets[BOX_REF], offsets[FRAME_BOX_REF]];
        scheduleOnUI(() => {
          'worklet';
          blockUIThread(WRITE_BLOCK_MS);
          for (const target of targets) {
            target.value = WRITTEN_VALUE;
          }
        });
      },
    },
  }
);

function OpaqueWriterBox(box: SizeBoxProps) {
  return <WriterBox {...box} initialOpacity={1} />;
}

const UNDER_WRITER_LAYOUT = layoutOf(
  {
    originX: { duration: LAYOUT_DURATION, hasCallback: true },
    opacity: { duration: LAYOUT_DURATION, initial: 0.9, to: 0.2 },
  },
  { name: 'under-writer' }
);

/** Each writer moves the opacity on a line during `LOOP_DURATION`. */
const LINE_WRITERS: {
  name: string;
  Box: React.ComponentType<SizeBoxProps>;
  from: number;
  to: number;
  startWriter?: () => void;
}[] = [
  {
    name: 'a CSS animation of the opacity',
    Box: CSSLoopBox,
    from: LOOP_KEYFRAMES.from.opacity,
    to: LOOP_KEYFRAMES.to.opacity,
  },
  {
    name: 'a timing animation of an animated style',
    Box: OpaqueWriterBox,
    from: 1,
    to: 0.5,
    startWriter: () => {
      opacities[BOX_REF].value = withTiming(0.5, {
        duration: LOOP_DURATION,
        easing: Easing.linear,
      });
    },
  },
];

describe('native layout live clock', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  for (const [caseName, referenceCase] of Object.entries({
    ...REFERENCE_CASES,
    ...LIVE_CLOCK_CASES,
  })) {
    test(`${caseName}: the two boxes agree on the wall clock`, async () => {
      const played = await play(referenceCase);
      const expectIn = (
        quantity: string,
        value: number,
        { from, to }: Band
      ) => {
        console.log(`LIVE | ${caseName} | ${quantity} | ${value.toFixed(3)}`);
        expect(value >= from && value <= to).toBe(true);
      };
      const twinChecks = played.frameChecks.filter(
        ({ record }) => record.box === 'frame'
      );

      const handOvers = handOversOf(played);
      const pairRows = pairRowsOf(referenceCase, played, handOvers);
      for (const { describe } of pairRows.filter(({ margin }) => margin < 0)) {
        console.log(`LIVE | ${caseName} | ${describe()}`);
      }
      for (const { allowance, describe } of pairRows) {
        if (allowance) {
          console.log([allowance, caseName, describe()].join(' | '));
        }
      }
      for (const [name, margins] of marginsOf(pairRows)) {
        console.log(
          `LIVE | ${caseName} | largest margin of the pair under its bound, ${name} | ${margins.to.toFixed(3)}`
        );
        expectIn(
          `smallest margin of the pair under its bound, ${name}`,
          margins.from,
          { from: 0, to: Infinity }
        );
      }
      for (const { text, isOnTrackOrInPair } of handOvers.flatMap((handOver) =>
        handOverRowsOf(handOver, played)
      )) {
        console.log(`LIVE | ${caseName} | ${text}`);
        expect(isOnTrackOrInPair).toBe(true);
      }
      for (const [phase, rows] of rowsInPhasesOf(played)) {
        expectIn(`rows of the native box in ${phase}`, rows, {
          from: 1,
          to: Infinity,
        });
      }
      expect(played.missingCallbacks).toBe('');
      const nativeCallback = callbackTimeOf('native');
      const twinCallback = callbackTimeOf('frame');
      const twinPhases = Math.max(
        ...twinChecks.map(({ timeline }) => timeline.phases.length)
      );
      const callbackGap = {
        from: -(twinPhases + 1) * FRAME_MS,
        to: 2 * FRAME_MS,
      };
      expectIn(
        'native end callback after the callback of the twin on the UI runtime, ms',
        nativeCallback.emittedMs - twinCallback.emittedMs,
        callbackGap
      );
      expectIn(
        'native end callback after the callback of the twin on the React Native runtime, ms',
        nativeCallback.receivedMs - twinCallback.receivedMs,
        callbackGap
      );
      for (const check of twinChecks) {
        const { record, timeline } = check;
        const leaf = describeLeaf(record);
        const frameTimes = record.frames.map(({ timeMs }) => timeMs);
        expectIn(
          `largest time from a frame of ${leaf} of the twin to the next, ms`,
          Math.max(
            ...frameTimes
              .slice(1)
              .map((timeMs, frame) => timeMs - frameTimes[frame])
          ),
          { from: -Infinity, to: 1.5 * FRAME_MS }
        );
        phaseStartsLateOf(check).forEach((lateMs, phase) =>
          expectIn(
            `computed start of phase ${phase} of ${leaf} of the twin after its declared start, ms`,
            lateMs,
            {
              from: startsWithNoDuration(timeline) ? -FRAME_MS : 0,
              to: phase * FRAME_MS + ROUNDING_MS,
            }
          )
        );
      }
      for (const [trackName, afterEndMs] of endReportsOf(played)) {
        expectIn(
          `end report of the track ${trackName} after its declared end, ms`,
          afterEndMs,
          { from: -FRAME_MS, to: 2 * FRAME_MS }
        );
      }
      for (const track of played.tracks) {
        const leaf = describeLeaf(track);
        if (track.replaced) {
          const firstReadMs = played.rows
            .map(({ row }) => row.native[track.target].monotonicTimeMs)
            .find((timeMs) => timeMs >= track.played.from);
          expectIn(
            `first row of the replacement of ${leaf} after its start, ms`,
            (firstReadMs ?? Infinity) - track.played.from,
            { from: 0, to: FIRST_FRAMES_MS }
          );
        }
        if (track.finished === false && !isReplaced(played, track)) {
          const clock = middleOf(played.clockOffset);
          const frames = played.frameChecks
            .filter(
              ({ record }) =>
                record.box === 'native' && isSameLeaf(record, track)
            )
            .flatMap(({ record }) => record.frames)
            .map(({ timeMs }) => timeMs + clock - track.played.to);
          console.log(
            `LIVE | ${caseName} | frames of the frame driver for ${leaf} at or before the end report of its track, ms after it | ${frames
              .filter((afterMs) => afterMs <= 0)
              .map((afterMs) => afterMs.toFixed(3))
              .join()}`
          );
          expectIn(
            `first frame of the frame driver for ${leaf} after the end report of its track, ms`,
            Math.min(...frames.filter((afterMs) => afterMs > 0)),
            { from: 0, to: 2 * FRAME_MS }
          );
        }
      }
      await render(null);
    });
  }

  if (!getStaticFeatureFlag('IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS')) {
    return;
  }

  const beforeMount =
    'a transform write between a commit and its mount comes before the mount';
  test(beforeMount, async () => {
    const played = await play(WRITE_BEFORE_MOUNT);
    const reads = expectReference(beforeMount, WRITE_BEFORE_MOUNT, played);
    const styled = reads.filter(
      ({ sampled }) => Math.abs(sampled.model[12] - WRITTEN_VALUE) >= 0.01
    );
    const lastStyledMs = Math.max(
      0,
      ...styled.map(
        ({ timeMs, tracks: [{ origin }] }) => timeMs - middleOf(origin)
      )
    );
    console.log(
      `LIVE | ${beforeMount} | reads from the mount with no written model, of ${reads.length} | ${styled.length}`
    );
    console.log(
      `LIVE | ${beforeMount} | last read with no written model, ms from the origin of the track | ${lastStyledMs.toFixed(3)}`
    );
    expect(reads.length > 0).toBe(true);
    expect(styled.length).toBe(0);
    await render(null);
  });

  for (const { name, Box, from, to, startWriter } of LINE_WRITERS) {
    const onLine = `${name} is on its line during a frame-driven layout animation with an opacity leaf`;
    test(onLine, async () => {
      const scene = (left: number) => (
        <View>
          <Box left={left} layout={UNDER_WRITER_LAYOUT} />
        </View>
      );
      const tag = await mountScene(scene(START_LEFT));
      startWriter?.();
      await wait(300);
      const before = await sampleOpacity(tag);
      const writerAt = (timeMs: number) =>
        before.presentation +
        ((to - from) / LOOP_DURATION) * (timeMs - before.time);
      await render(scene(END_LEFT));
      await wait(2 * FRAME_MS);
      const distances = (await sampleRows(tag, 8, LAYOUT_DURATION / 16)).map(
        ({ presentation, time }) => {
          const distance = Math.abs(presentation - writerAt(time));
          console.log(
            `LIVE | ${onLine} | writer distance at ${(time - before.time).toFixed(2)} ms after the first sample | ${distance.toFixed(4)}`
          );
          return distance;
        }
      );
      for (const distance of distances) {
        expect(distance < SAMPLED_OPACITY_TOLERANCE).toBe(true);
      }
      await render(null);
    });
  }
});

const startsWithNoDuration = ({ phases: [first] }: Timeline) =>
  first.durationMs === 0;

const isIn = ({ from, to }: Band, timeMs: number) =>
  timeMs >= from && timeMs <= to;

const COVERED_PHASE_MS = 100;

/**
 * The count of rows with a sample of the native box in each phase of
 * `COVERED_PHASE_MS` or more of each track that played to the end of the
 * phase.
 */
function rowsInPhasesOf({ rows, tracks }: Played) {
  const counts = new Map<string, number>();
  for (const track of tracks) {
    const { timeline, origin, played, target, generation } = track;
    const starts = declaredStartsOf(timeline);
    timeline.phases.forEach(({ durationMs }, phase) => {
      const startMs = middleOf(origin) + starts[phase];
      const window = {
        from: Math.max(startMs, played.from),
        to: startMs + durationMs,
      };
      if (durationMs >= COVERED_PHASE_MS && window.to <= played.to) {
        counts.set(
          `phase ${phase} of ${describeLeaf(track)} of the command ${generation}`,
          rows.filter(({ row }) =>
            isIn(window, row.native[target].monotonicTimeMs)
          ).length
        );
      }
    });
  }
  return counts;
}

const pairGapOf = (native: TargetSample, twin: TargetSample) =>
  Math.abs(native.presentation[0] - twin.model[0]);

/** The terms of the bound of the pair of a scalar key, and their sum. */
type PairBound = {
  tolerance: number;
  /** `declaredPairChangeAt` of the key at the time. */
  declaredChange: PairChanges;
  /** The distance of the declared timelines of the two boxes at the time. */
  startValues: number;
  total: number;
};

function pairBoundOf(
  track: ScalarTrack,
  played: Played,
  timeMs: number,
  samples: Samples
): PairBound {
  const shown = shownTrackOf(track, played.tracks, samples);
  const { tolerance } = track;
  const declaredChange = declaredPairChangeAt(
    shown,
    timeMs,
    Math.max(1, startedPhasesOf(track, timeMs - middleOf(track.origin)))
  );
  const twin = twinStartOf(track, played);
  const startValues = twin
    ? Math.abs(
        twin.declared(timeMs - twin.timeMs) -
          track.declared(timeMs - middleOf(track.origin))
      )
    : 0;
  return {
    tolerance,
    declaredChange,
    startValues,
    total: tolerance + declaredChange.removalWindow + startValues,
  };
}

/**
 * The row name of statement A for the rule without which a distance is over the
 * declared change of a pair bound: none for a distance in the change of the
 * stay, and none for a distance over each change.
 */
function allowanceOf(
  distance: number,
  { stay, edgeHold, removalWindow }: PairChanges
) {
  if (distance <= stay || distance > removalWindow) {
    return undefined;
  }
  return distance <= edgeHold ? 'EDGE-HOLD' : 'REMOVAL-WINDOW';
}

const describePairBound = ({
  tolerance,
  declaredChange,
  startValues,
  total,
}: PairBound) =>
  `bound ${total.toFixed(4)}: tolerance ${tolerance}, declared change of the read band and the frames ${declaredChange.removalWindow.toFixed(4)}, with no removal window ${declaredChange.edgeHold.toFixed(4)}, with no held value ${declaredChange.stay.toFixed(4)}, distance of the declared timelines of the two boxes ${startValues.toFixed(4)}`;

/**
 * The start of the twin of a track that starts at a captured value: the
 * declared timeline of the twin from its start value, its start on the sample
 * clock, and the time of the last frame of its replaced record at the start
 * call. That frame can have the time of the start call.
 */
function twinStartOf(track: ScalarTrack, { frameChecks, clockOffset }: Played) {
  if (!track.captured) {
    return undefined;
  }
  const check = frameChecks.find(
    ({ record, declared }) =>
      record.box === 'frame' && declared === track.declaration
  );
  const start = check?.record.adoptedStart ?? check?.record.start;
  if (!check || !start) {
    throw new Error(
      `The twin has no start of ${describeLeaf(track)} of the command ${track.generation}.`
    );
  }
  const clock = middleOf(clockOffset);
  const replacedFrames = check.record.start?.replacedFrames ?? 0;
  const lastFrame = check.replaced?.record.frames[replacedFrames - 1];
  return {
    declared: declaredValueOf(check.timeline),
    value: check.timeline.from,
    timeMs: start.timeMs + clock,
    lastFrameMs: lastFrame && lastFrame.timeMs + clock,
  };
}

/** One row for each request step in the hand-over window of a track. */
function handOverRowsOf(handOver: HandOver, played: Played) {
  const { track, startCallMs, window } = handOver;
  const { key, generation, origin, tolerance, target } = track;
  const originMs = middleOf(origin);
  return played.rows.flatMap(({ row }) => {
    const native = row.native[target];
    const shown = shownTrackOf(track, played.tracks, row.native);
    const twin = row.frame[target];
    const timeMs = native.monotonicTimeMs;
    if (!isIn(window, timeMs)) {
      return [];
    }
    const [value] = native.presentation;
    const band = declaredBandOf(shown, timeMs);
    const {
      distances: [distance],
      isOnTimeline,
    } = nativeResidualOf([value], timeMs, [shown]);
    const gap = pairGapOf(native, twin);
    const bound = pairBoundOf(track, played, timeMs, row.native).total;
    const isInPair = gap <= bound;
    return [
      {
        text: [
          `hand-over row of ${key} of the command ${generation}`,
          `native sample ${(timeMs - originMs).toFixed(2)} ms and twin sample ${(twin.monotonicTimeMs - originMs).toFixed(2)} ms after the origin ${originMs.toFixed(2)} ms`,
          `${(timeMs - startCallMs).toFixed(2)} ms after the start call of the frame driver and ${(timeMs - track.played.to).toFixed(2)} ms after the end report of the track`,
          `playback keys ${native.playbackKeys.join()}`,
          `native presentation ${value.toFixed(4)}`,
          `native model ${native.model[0].toFixed(4)}`,
          `twin model ${twin.model[0].toFixed(4)}`,
          `pair gap ${gap.toFixed(4)} with the bound ${bound.toFixed(4)}`,
          `values of the track ${band.from.toFixed(4)}..${band.to.toFixed(4)} with the tolerance ${tolerance}, distance ${distance.toFixed(4)}`,
          `${isOnTimeline ? 'on its track' : 'NOT on its track'}, ${isInPair ? 'in the pair bound' : 'NOT in the pair bound'}`,
        ].join(' | '),
        isOnTrackOrInPair: isOnTimeline || isInPair,
      },
    ];
  });
}

/**
 * The pair of one scalar key, or of the `Transform` target, at one request
 * step.
 */
type PairRow = {
  name: string;
  /** The bound of the pair at the step minus the distance of the two boxes. */
  margin: number;
  /** `allowanceOf` of the pair. */
  allowance?: string;
  describe: () => string;
};

/**
 * The pair of each scalar key and of the `Transform` target in each row. The
 * rows of a hand-over window are not in it: `handOverRowsOf` has them.
 */
function pairRowsOf(
  referenceCase: ReferenceCase,
  played: Played,
  handOvers: HandOver[]
) {
  const twinWrites = new Map<number, TwinWrite[]>();
  const matrixTolerance = matrixToleranceOf(referenceCase);
  return played.rows.flatMap(({ row }) =>
    targetsOf(referenceCase).flatMap((target): PairRow[] => {
      const native = row.native[target];
      const twin = row.frame[target];
      const timeMs = native.monotonicTimeMs;
      const tracks = checkedTracksOf(played.tracks, target, timeMs);
      const pairs = tracks
        .filter(isScalarTrack)
        .filter(
          (track) =>
            !handOvers.some(
              (handOver) =>
                handOver.track === track && isIn(handOver.window, timeMs)
            )
        )
        .map((track) => scalarPairOf(track, row.native, twin, played));
      if (tracks.some((track) => !isScalarTrack(track))) {
        const [{ generation }] = tracks;
        if (!twinWrites.has(generation)) {
          twinWrites.set(generation, twinWritesOf(played, tracks));
        }
        pairs.push(
          ...cellsPairsOf(
            tracks,
            played.tracks,
            row.native,
            twin,
            twinWrites.get(generation)!,
            matrixTolerance
          )
        );
      }
      return pairs;
    })
  );
}

/** The smallest and the largest margin of the pair rows of each name. */
function marginsOf(pairRows: PairRow[]) {
  const margins = new Map<string, Band>();
  for (const { name, margin } of pairRows) {
    const { from, to } = margins.get(name) ?? { from: Infinity, to: -Infinity };
    margins.set(name, {
      from: Math.min(from, margin),
      to: Math.max(to, margin),
    });
  }
  return margins;
}

const describePairStep = (
  { generation, origin }: PlayedTrack,
  name: string,
  native: TargetSample,
  twin: TargetSample,
  margin: number
) =>
  `pair row of ${name} of the command ${generation}${margin < 0 ? ' over its bound' : ''} | native sample ${(native.monotonicTimeMs - middleOf(origin)).toFixed(2)} ms and twin sample ${(twin.monotonicTimeMs - middleOf(origin)).toFixed(2)} ms after the origin ${middleOf(origin).toFixed(2)} ms | playback keys ${native.playbackKeys.join()}`;

/**
 * Of a track that starts at a captured value: the start value of each box, and
 * the start call of the twin and its last frame at it, from the origin of the
 * track.
 */
function describeStartValues(track: ScalarTrack, played: Played) {
  const twin = twinStartOf(track, played);
  if (!track.captured || !twin) {
    return [];
  }
  const originMs = middleOf(track.origin);
  const { lastFrameMs } = twin;
  return [
    `native start value ${track.captured.value} at its origin, twin start value ${twin.value} at ${(twin.timeMs - originMs).toFixed(2)} ms after that origin, last frame of the twin at its start call at ${lastFrameMs === undefined ? 'none' : `${(lastFrameMs - originMs).toFixed(2)} ms`}`,
  ];
}

function scalarPairOf(
  track: ScalarTrack,
  samples: Samples,
  twin: TargetSample,
  played: Played
): PairRow {
  const native = samples[track.target];
  const gap = pairGapOf(native, twin);
  const bound = pairBoundOf(track, played, native.monotonicTimeMs, samples);
  const margin = bound.total - gap;
  return {
    name: track.key,
    margin,
    allowance: allowanceOf(
      gap - bound.tolerance - bound.startValues,
      bound.declaredChange
    ),
    describe: () =>
      [
        describePairStep(track, track.key, native, twin, margin),
        `native presentation ${native.presentation[0].toFixed(4)}`,
        `twin model ${twin.model[0].toFixed(4)}`,
        `pair gap ${gap.toFixed(4)}`,
        `margin ${margin.toFixed(4)}`,
        describePairBound(bound),
        ...describeStartValues(track, played),
      ].join(' | '),
  };
}

const startedPhasesOf = ({ timeline }: PlayedTrack, timeMs: number) =>
  declaredStartsOf(timeline).filter((startMs) => startMs <= timeMs).length;

/**
 * The operation values of one write of the twin, and the cells that its model
 * has with them.
 */
type TwinWrite = { values: OperationValue[]; cells: number[] };

/**
 * The writes of the twin for the operations of tracks: for each time at which
 * the frame driver started or stepped one of the operations, the last value of
 * each operation. A plain value of an operation is its end value.
 */
function twinWritesOf(played: Played, operations: PlayedTrack[]): TwinWrite[] {
  const writes = operations.map((track) => {
    const written = played.frameChecks
      .filter(
        ({ record }) => record.box === 'frame' && isSameLeaf(record, track)
      )
      .flatMap(({ record }) => [
        ...(record.start ? [record.start] : []),
        ...record.frames,
      ]);
    if (written.length === 0 && !track.declaration.isPlain) {
      throw new Error(
        `The twin has no frame record of ${describeLeaf(track)} of the command ${track.generation}, and the case does not declare a plain value for it.`
      );
    }
    return written;
  });
  const times = [...new Set(writes.flat().map(({ timeMs }) => timeMs))];
  return times.flatMap((timeMs) => {
    const values = operations.flatMap(
      ({ key, timeline, declaration }, operation): OperationValue[] => {
        if (declaration.isPlain) {
          return [
            { kind: key, amount: declaredEndOf(timeline), unit: timeline.unit },
          ];
        }
        const written = writes[operation].filter(
          (write) => write.timeMs <= timeMs
        );
        return written.length === 0
          ? []
          : [{ kind: key, ...amountOf(written[written.length - 1].value) }];
      }
    );
    return values.length < operations.length
      ? []
      : [{ values, cells: cellsOf(values, 'rest') }];
  });
}

const CHANGING_CELLS = 'Transform, the cells with a declared change';

/**
 * The pairs of the `Transform` target: the cell that the native box shows with
 * the smallest margin from the cell of the write of the twin that the model of
 * the twin shows, of all the cells, and of the cells whose bound has a declared
 * change when there is one. Each operation of the twin can be behind by its own
 * started phases, one at the least.
 */
function cellsPairsOf(
  operations: PlayedTrack[],
  tracks: PlayedTrack[],
  samples: Samples,
  twin: TargetSample,
  twinWrites: TwinWrite[],
  matrixTolerance: MatrixTolerance
): PairRow[] {
  const native = samples[operations[0].target];
  const toleranceOfCell = (cell: number) =>
    cellToleranceOf(cell, matrixTolerance);
  const distanceFromModel = ({ cells }: TwinWrite) =>
    Math.max(
      ...cells.map(
        (cell, index) =>
          Math.abs(cell - twin.model[index]) / toleranceOfCell(index)
      )
    );
  const fromModel = twinWrites.map(distanceFromModel);
  const nearest = Math.min(...fromModel);
  const shown = twinWrites[fromModel.indexOf(nearest)];
  if (!shown || nearest > 1) {
    throw new Error(
      `The model of the twin ${twin.model.join()} shows no write of its record.`
    );
  }
  const timeMs = native.monotonicTimeMs;
  const fromOriginMs = timeMs - middleOf(operations[0].origin);
  const layer = layerOf(native);
  const framesBeforeOf = (track: PlayedTrack) =>
    Math.max(1, startedPhasesOf(track, fromOriginMs));
  const changes = operationPairChangesAt(
    operations,
    tracks,
    matrixTolerance,
    layer,
    timeMs,
    framesBeforeOf,
    samples
  );
  const twinCells = cellsOf(shown.values, layer);
  const gaps = twinCells.map((cell, index) =>
    Math.abs(native.presentation[index] - cell)
  );
  const margins = gaps.map(
    (gap, index) => toleranceOfCell(index) + changes[index].removalWindow - gap
  );
  const allowances = gaps.map((gap, index) =>
    allowanceOf(gap - toleranceOfCell(index), changes[index])
  );
  const pairOf = (name: string, cells: number[]): PairRow => {
    const least = cells.reduce((first, second) =>
      margins[second] < margins[first] ? second : first
    );
    const margin = margins[least];
    const cell =
      margin < 0 ? least : (cells.find((each) => allowances[each]) ?? least);
    return {
      name,
      margin,
      allowance: allowances[cell],
      describe: () =>
        [
          describePairStep(operations[0], name, native, twin, margin),
          `cell ${cell}: native presentation ${native.presentation[cell].toFixed(4)}`,
          `write of the twin ${twinCells[cell].toFixed(4)}`,
          `pair gap ${gaps[cell].toFixed(4)}`,
          `margin ${margins[cell].toFixed(4)}`,
          `bound ${(toleranceOfCell(cell) + changes[cell].removalWindow).toFixed(4)}: tolerance ${toleranceOfCell(cell)}, declared change of the read band and the frames ${changes[cell].removalWindow.toFixed(4)}, with no removal window ${changes[cell].edgeHold.toFixed(4)}, with no held value ${changes[cell].stay.toFixed(4)}, with ${operations.map(framesBeforeOf).join()} display frames before the step for the operations`,
        ].join(' | '),
    };
  };
  const allCells = margins.map((_, cell) => cell);
  const changingCells = allCells.filter(
    (cell) => changes[cell].removalWindow > 0
  );
  return [
    pairOf('Transform', allCells),
    ...(changingCells.length > 0
      ? [pairOf(CHANGING_CELLS, changingCells)]
      : []),
  ];
}

/**
 * For each track that played to its end: how long after the declared end of its
 * longest key the trace has its end.
 */
function endReportsOf({ tracks }: Played) {
  const reports = new Map<string, number>();
  for (const { target, generation, played, origin, finished } of tracks) {
    if (finished) {
      const totals = tracks
        .filter(
          (track) => track.target === target && track.generation === generation
        )
        .map(({ timeline }) => declaredDurationOf(timeline));
      reports.set(
        `${target} ${generation}`,
        played.to - middleOf(origin) - Math.max(...totals)
      );
    }
  }
  return reports;
}
