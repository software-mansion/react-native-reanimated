/*
 * Each test that plays a case (`playCase`, `playNatively`) has the method of the suite
 * `native layout reference`, each box on its own clock: each sample of the `Transform` target of the native
 * box has the 16 cells of the matrix of the declared values of its operations at one time of the 18 ms plus
 * the clock uncertainty before the sample, from the origin of its command (statement A); each frame of the
 * frame-driven twin and of the frame driver on the native box is on a replay of the declared timeline at
 * its frame time (statement B); at the end the native box shows its model and the twin has the same model.
 * A check of a playback key count or of a held value in such a test is for each row, by the time of the row
 * against the times of the trace and the declared times. The end report of a track and the callback of the
 * native box have the lower bound of their time from the origin, one display frame before the declared end:
 * the platform can remove an animation up to 1.78 ms before its declared end (`REMOVAL_LEAD_MS`, measured),
 * so the bound has a margin of 14.89 ms. The physical animations of a track are the ones of its middle read.
 * The tolerance of a cell is 0.005, and of a translation 0.25. The test of the live size track and the test
 * of the keyframe animation have state checks and trace checks at planned times. The test in which the
 * frame driver takes the `Transform` track has statement M of the suite `native layout transform`, with its
 * limits.
 *
 * The method does not prove: the distance of the two boxes at one instant, the lag of the frame driver,
 * that the two starts are in one display frame, how late an end report or a callback comes, that a row
 * comes in each part of a timeline, a native value in the first display frame after its origin to better
 * than one display frame, a read in the first 18 ms of a track (its operations start at the initial values
 * of the builder, which the view did not show). The pixels on screen, the order in which the screen shows
 * the operations, a device, and 120 Hz are not tested.
 *
 * Statement A has the edge hold of `native layout reference`. Within the read band, this suite cannot
 * distinguish the platform hold from a native segment that keeps its start value through eased progress
 * 0.001 or shows its end value from eased progress 0.999. The frame-driven twin keeps its exact curve check
 * without a hold allowance.
 *
 * The suite `native layout live clock` has the wall-clock statements for `OPERATION_TIMELINE_CASES` of
 * `nativeLayoutLiveClockCases.ts`: the pair of the two boxes at one instant, the end report of a track no
 * more than two display frames after its declared end, the gap of the two end callbacks, a row of the
 * native box in each phase, and the first row of a replacement in its first three display frames.
 */
import React from 'react';
import type { ViewStyle } from 'react-native';
import { View } from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, { Keyframe } from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import {
  BACK_AT_START,
  HELD_AND_MOVING,
  HELD_AND_MOVING_COMMIT_MS,
  OPERATION_TIMELINE_CASES,
  timelinesOf,
} from './nativeLayoutLiveClockCases';
import type {
  Played,
  ReferenceCase,
  RowRead,
} from './nativeLayoutReferencePlay';
import {
  expectModelOnFrames,
  expectOneKeyWhilePlaying,
  expectReference,
  play,
} from './nativeLayoutReferencePlay';
import type {
  Operation,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbackOf,
  callbacks,
  callbackTimeOf,
  cellToleranceOf,
  declaredBandOf,
  endTransformOf,
  FRAME_BOX_REF,
  FRAME_MS,
  frameDrivenOf,
  hasNativeLayoutRoute,
  isHostEvent,
  layoutBuilderCalls,
  layoutOf,
  middleOf,
  mountScene,
  playbackIdOf,
  playbackIdsOf,
  PLAYS_CORE_ANIMATION_MEMBERS,
  PLAYS_SIZE_CHANGE,
  sample,
  SizePair,
  styles,
  summarize,
  takeTrace,
  movingGeometryTest,
  TRANSFORM_SAMPLE_CELLS,
} from './nativeLayoutTestKit';

const START_LEFT = 60;
const END_LEFT = 62;
const DEGREE = Math.PI / 180;
const QUARTER_TURN = Math.PI / 2;
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const TRANSFORM_START =
  'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Transform > Admitted';
const TRANSFORM_END = 'TrackEnded:Transform:true > Ended:Finished:None';

const isStartEvent = ({ event }: TraceEvent) =>
  event !== 'TrackEnded' && event !== 'Ended';
const summarizeStart = (events: TraceEvent[]) =>
  summarize(events.filter(isHostEvent).filter(isStartEvent));
const summarizeAfterStart = (events: TraceEvent[]) =>
  summarize(events.filter(isHostEvent).filter((event) => !isStartEvent(event)));

const largestCellDifference = (first: number[], second: number[]) =>
  Math.max(...first.map((cell, index) => Math.abs(cell - second[index])));

type Member = TargetSample['members'][number];

const propertiesOf = (members: Member[]) =>
  members.map(({ property }) => property).join();

/** The first component of each value of a member, or its matrix cell. */
const valuesOf = ({ values }: Member, cell = 0) =>
  values.map((value) => value[cell]);

function expectNear(shown: number[], expected: number[], tolerance = 1e-6) {
  expect(shown.length).toBe(expected.length);
  expect(
    shown.every((value, index) => Math.abs(value - expected[index]) < tolerance)
  ).toBe(true);
}

/**
 * The member of the operation at `operation` in the style array: Core Animation
 * has an identity base member and the operations in the reverse order, Android
 * has the operations in their order.
 */
const operationMemberOf = (members: Member[], operation: number) =>
  PLAYS_CORE_ANIMATION_MEMBERS
    ? members[members.length - 1 - operation]
    : members[operation];

/**
 * A member of a platform with no Core Animation members: one for each
 * operation, in the order of the style array, with the value of the operation
 * at its start and at the end of each segment. `keeps` is the one value of an
 * operation that does not change.
 */
type ListOrderMember = {
  kind: string;
  keyTimes?: number[];
  values?: number[];
  keeps?: number;
};

function expectListOrderMembers(
  members: Member[],
  expected: ListOrderMember[]
) {
  expect(propertiesOf(members)).toBe(
    expected.map(({ kind }) => `transform.${kind}`).join()
  );
  expected.forEach(({ keyTimes, values, keeps }, operation) => {
    const member = members[operation];
    if (keyTimes) {
      expectNear(member.keyTimes, keyTimes);
    }
    if (values) {
      expectNear(valuesOf(member), values);
    }
    if (keeps !== undefined) {
      expect(
        valuesOf(member).every((value) => Math.abs(value - keeps) < 1e-6)
      ).toBe(true);
    }
  });
}

async function playCase(caseName: string, referenceCase: ReferenceCase) {
  const builderCallsBefore = layoutBuilderCalls.length;
  const played = await play(referenceCase);
  const reads = expectReference(caseName, referenceCase, played);
  expectAtRest(played);
  const commits = referenceCase.places.length - 1;
  for (const box of ['native', 'frame']) {
    expect(
      layoutBuilderCalls
        .slice(builderCallsBefore)
        .filter((name) => name === box).length
    ).toBe(commits);
  }
  return { ...played, reads };
}

function expectAtRest({ end }: Played) {
  const { presentation, model, playbacks } = end!.native.Transform;
  expect(playbacks.length).toBe(0);
  expect(largestCellDifference(presentation, model)).toBe(0);
  expect(largestCellDifference(model, end!.frame.Transform.model) < 0.01).toBe(
    true
  );
}

/**
 * Plays a case of one native track: the track plays to the end of its longest
 * operation with one playback key, and ends one time.
 */
async function playNatively(caseName: keyof typeof OPERATION_TIMELINE_CASES) {
  const referenceCase = OPERATION_TIMELINE_CASES[caseName];
  const played = await playCase(caseName, referenceCase);
  expect(summarizeStart(played.events)).toBe(TRANSFORM_START);
  expect(summarizeAfterStart(played.events)).toBe(TRANSFORM_END);
  expectOneKeyWhilePlaying(played.reads);
  expectNoEndBefore(played, referenceCase.totalMs);
  return { ...played, members: membersOf(played.reads) };
}

/**
 * The first track plays to its end. Its end report and the callback of the
 * native box come no more than one display frame before a time from the origin
 * of the track.
 */
function expectNoEndBefore(
  { tracks: [track], clockOffset }: Played,
  endMs: number
) {
  const originMs = middleOf(track.origin);
  const earliestMs = endMs - FRAME_MS;
  expect(track.finished).toBe(true);
  expect(track.played.to - originMs > earliestMs).toBe(true);
  const { emittedMs } = callbackTimeOf('native');
  expect(emittedMs + middleOf(clockOffset) - originMs > earliestMs).toBe(true);
}

/** The physical animations in the middle read of the last command of the reads. */
function membersOf(reads: RowRead[]) {
  const [{ generation }] = reads[reads.length - 1].tracks;
  const ofCommand = reads.filter(
    ({ tracks: [track] }) => track.generation === generation
  );
  return ofCommand[Math.floor(ofCommand.length / 2)].sampled.members;
}

describe('native layout operation timelines', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'a rotation in the first half of the time of a translation: one track, the rotation member holds its end value, and one callback at the end of the translation',
    async () => {
      const { members } = await playNatively(
        'a rotation in the first half of the time of a translation'
      );
      if (PLAYS_CORE_ANIMATION_MEMBERS) {
        expect(propertiesOf(members)).toBe(
          'transform,transform.translateX,transform.rotateZ'
        );
        expectNear(members[0].keyTimes, [0, 1]);
        expect(members[0].values[0].join()).toBe(IDENTITY.join());
        expectNear(members[1].keyTimes, [0, 1]);
        expectNear(valuesOf(members[1]), [0, 100]);
        expectNear(members[2].keyTimes, [0, 0.5, 1]);
        expectNear(valuesOf(members[2]), [0, QUARTER_TURN, QUARTER_TURN]);
      } else {
        expectListOrderMembers(members, [
          {
            kind: 'rotateZ',
            keyTimes: [0, 0.5, 1],
            values: [0, QUARTER_TURN, QUARTER_TURN],
          },
          { kind: 'translateX', keyTimes: [0, 1], values: [0, 100] },
        ]);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'a rotation with a delay beside a translation: the rotation member holds its start value for the delay and its end value after its time',
    async () => {
      const { members } = await playNatively(
        'a rotation with a delay beside a translation'
      );
      const ROTATION_KEY_TIMES = [0, 0.3, 0.8, 1];
      const ROTATION_VALUES = [
        30 * DEGREE,
        30 * DEGREE,
        QUARTER_TURN,
        QUARTER_TURN,
      ];
      if (PLAYS_CORE_ANIMATION_MEMBERS) {
        expect(propertiesOf(members)).toBe(
          'transform,transform.rotateZ,transform.translateX'
        );
        expectNear(members[1].keyTimes, ROTATION_KEY_TIMES);
        expectNear(valuesOf(members[1]), ROTATION_VALUES);
        expectNear(members[2].keyTimes, [0, 1]);
      } else {
        expectListOrderMembers(members, [
          { kind: 'translateX', keyTimes: [0, 1] },
          {
            kind: 'rotateZ',
            keyTimes: ROTATION_KEY_TIMES,
            values: ROTATION_VALUES,
          },
        ]);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'three operations with three durations: each member has its own key times, and the callback comes at the end of the longest operation',
    async () => {
      const { members } = await playNatively(
        'three operations with three durations'
      );
      if (PLAYS_CORE_ANIMATION_MEMBERS) {
        expect(propertiesOf(members)).toBe(
          'transform,transform.rotateZ,transform.scale,transform.translateX'
        );
        expectNear(members[1].keyTimes, [0, 0.35, 1]);
        expectNear(valuesOf(members[1]), [0, 60 * DEGREE, 60 * DEGREE]);
        expectNear(members[2].keyTimes, [0, 0.6, 1]);
        expect(members[2].values.map((value) => value.join()).join(' ')).toBe(
          '0.5,0.5,0.5 1.2,1.2,1.2 1.2,1.2,1.2'
        );
        expectNear(members[3].keyTimes, [0, 0.5, 1]);
        expectNear(valuesOf(members[3]), [0, 40, 80]);
      } else {
        expectListOrderMembers(members, [
          { kind: 'translateX', keyTimes: [0, 0.5, 1], values: [0, 40, 80] },
          { kind: 'scale', keyTimes: [0, 0.6, 1], values: [0.5, 1.2, 1.2] },
          {
            kind: 'rotateZ',
            keyTimes: [0, 0.35, 1],
            values: [0, 60 * DEGREE, 60 * DEGREE],
          },
        ]);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'an operation alone with the default easing, a hold, and a second move: the native values and the frames of the frame driver are on its timeline',
    async () => {
      const { members } = await playNatively(
        'an operation alone with the default easing, a hold, and a second move'
      );
      const translation = operationMemberOf(members, 0);
      expectNear(translation.keyTimes, [
        0,
        250 / 1400,
        500 / 1400,
        800 / 1400,
        1,
      ]);
      expectNear(valuesOf(translation), [0, 40, 80, 80, 20]);
      if (!PLAYS_CORE_ANIMATION_MEMBERS) {
        expect(propertiesOf(members)).toBe('transform.translateX');
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'a plain value of an operation shows from the start beside an operation that moves',
    async () => {
      const { members } = await playNatively(
        'a plain value of an operation beside an operation that moves'
      );
      if (PLAYS_CORE_ANIMATION_MEMBERS) {
        expect(propertiesOf(members)).toBe(
          'transform,transform,transform.rotateZ'
        );
        expectNear(valuesOf(members[1], 12), [30, 30]);
        expectNear(members[2].keyTimes, [0, 1]);
      } else {
        expectListOrderMembers(members, [
          { kind: 'rotateZ', keyTimes: [0, 1] },
          { kind: 'translateX', keeps: 30 },
        ]);
      }
      await render(null);
    }
  );

  const TRANSLATION_END = 60;
  for (const time of ['longer', 'shorter'] as const) {
    movingGeometryTest(
      `an operation that keeps its value for a ${time} time than the operation that moves: the track ends at the end of the longer operation`,
      async () => {
        const { members, reads } = await playNatively(
          `an operation that keeps its value for a ${time} time than the operation that moves`
        );
        const translationKeyTimes = time === 'longer' ? [0, 0.5, 1] : [0, 1];
        if (PLAYS_CORE_ANIMATION_MEMBERS) {
          expect(propertiesOf(members)).toBe(
            'transform,transform.translateX,transform'
          );
          expectNear(members[1].keyTimes, translationKeyTimes);
          expectNear(members[2].keyTimes, [0, 1]);
        } else {
          expectListOrderMembers(members, [
            { kind: 'scale', keeps: 1 },
            { kind: 'translateX', keyTimes: translationKeyTimes },
          ]);
        }
        const held = reads.filter(({ checked, timeMs, afterGap }) => {
          // `checked` has the tracks of the cells of a sample, in the order of `TRANSFORM_SAMPLE_CELLS`.
          const { from, to } = declaredBandOf(
            checked[TRANSFORM_SAMPLE_CELLS.indexOf(12)],
            timeMs
          );
          return (
            !afterGap && from === TRANSLATION_END && to === TRANSLATION_END
          );
        });
        if (time === 'longer') {
          expect(held.length > 0).toBe(true);
        }
        for (const { sampled } of held) {
          expect(sampled.presentation[12]).toBe(TRANSLATION_END);
        }
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'a first part with no duration before a part with a duration gives its value to the start of the operation',
    async () => {
      const { members } = await playNatively(
        'a first part with no duration before a part with a duration'
      );
      if (PLAYS_CORE_ANIMATION_MEMBERS) {
        expectNear(members[1].keyTimes, [0, 0.5, 1]);
        expectNear(valuesOf(members[2]), [40, 0]);
      } else {
        expectListOrderMembers(members, [
          { kind: 'translateX', values: [40, 0] },
          { kind: 'scaleY', keyTimes: [0, 0.5, 1] },
        ]);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'an operation with control points beside an operation with a fitted easing function: each member has the keys of its own timing',
    async () => {
      const { members } = await playNatively(
        'an operation with control points beside an operation with a fitted easing function'
      );
      if (PLAYS_CORE_ANIMATION_MEMBERS) {
        expect(propertiesOf(members)).toBe(
          'transform,transform.rotateZ,transform.translateX'
        );
      } else {
        expectListOrderMembers(members, [
          { kind: 'translateX' },
          { kind: 'rotateZ' },
        ]);
      }
      const [translation, rotation] = [0, 1].map((operation) =>
        operationMemberOf(members, operation)
      );
      expect(rotation.keyTimes.length).toBe(24);
      expectNear(rotation.keyTimes.slice(-2), [0.7, 1]);
      expectNear(valuesOf(rotation).slice(-2), [QUARTER_TURN, QUARTER_TURN]);
      expectNear(translation.keyTimes, [0, 1]);
      await render(null);
    }
  );

  movingGeometryTest(
    'a hold between two moves of one operation while another operation moves: the hold is a key of that member only',
    async () => {
      const { members } = await playNatively(
        'a hold between two moves of one operation while another operation moves'
      );
      const HELD_KEY_TIMES = [0, 0.3, 0.5, 0.8, 1];
      const HELD_VALUES = [0, -40, -40, 0, 0];
      if (PLAYS_CORE_ANIMATION_MEMBERS) {
        expect(propertiesOf(members)).toBe(
          'transform,transform.translateX,transform.translateY'
        );
        expectNear(members[1].keyTimes, [0, 1]);
        expectNear(members[2].keyTimes, HELD_KEY_TIMES);
        expectNear(valuesOf(members[2]), HELD_VALUES);
      } else {
        expectListOrderMembers(members, [
          { kind: 'translateY', keyTimes: HELD_KEY_TIMES, values: HELD_VALUES },
          { kind: 'translateX', keyTimes: [0, 1] },
        ]);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'operations with two timelines and a leaf with no native form stay frame-driven as a whole, with one builder call and one callback',
    async () => {
      const { events, rows } = await playCase(
        'operations with two timelines and a leaf with no native form',
        timelinesOf(
          [
            ['rotate', '0deg', '90deg', { duration: 300 }],
            ['translateX', 0, 100, { duration: 600 }],
          ],
          600,
          {
            leaves: { opacity: { isSpring: true, initial: 0.5, to: 1 } },
            isFrameDriven: true,
          }
        )
      );
      expect(
        summarize(events.filter(({ event }) => event !== 'FrameUpdateMounted'))
      ).toBe('LayoutBuildFailed:UnsupportedTiming');
      for (const { row } of rows) {
        expect(row.native.Transform.playbacks.length).toBe(0);
      }
      await render(null);
    }
  );
});

describe('native layout operation timelines and a new start', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  /** The events from the start of the second build of the native box. */
  const secondBuildOf = (events: TraceEvent[]) =>
    events.slice(
      events.findIndex(
        ({ event }, index) =>
          index > 0 &&
          (event === 'LayoutStartPending' || event === 'LayoutBuildFailed')
      )
    );

  movingGeometryTest(
    'a new start with other end values at 40 %, while one operation holds and one moves, replaces the track: the native values and the frames of the frame driver are on the two timelines',
    async () => {
      const caseName =
        'a new start with other end values while one operation holds and one moves';
      const { events, reads } = await playCase(
        caseName,
        OPERATION_TIMELINE_CASES[caseName]
      );
      expect(summarize(secondBuildOf(events).filter(isHostEvent))).toBe(
        `LayoutStartPending > LayoutStartMounted > Received > TrackEnded:Transform:false > Ended:Interrupted:None > TrackStarted:Transform > Admitted > ${TRANSFORM_END}`
      );
      expectOneKeyWhilePlaying(reads);
      expectNear(operationMemberOf(membersOf(reads), 1).keyTimes, [0, 0.5, 1]);
      await render(null);
    }
  );

  movingGeometryTest(
    'a new start with the same end values after the end of the shorter operation gives the view to the frame driver to its end: the frames of the frame driver on the two boxes are on the timelines, each start has one builder call, each callback comes one time, and no native playback starts',
    async () => {
      const caseName = 'a new start with the same end values';
      const played = await playCase(
        caseName,
        timelinesOf(HELD_AND_MOVING, 2000, {
          replacement: {
            leaves: {},
            operations: [
              ['translateX', 80, 80, { duration: 400 }],
              ['translateY', 24, 60, { duration: 2000 }],
            ],
            isFrameDriven: true,
          },
          places: BACK_AT_START,
          commitTimesMs: [HELD_AND_MOVING_COMMIT_MS],
        })
      );
      const second = secondBuildOf(played.events);
      expect(
        second
          .filter(({ event }) => event === 'LayoutBuildFailed')
          .map(({ buildFailure }) => buildFailure)
          .join()
      ).toBe('UnsupportedContinuation');
      expect(second.some(({ event }) => event === 'TrackStarted')).toBe(false);
      const takenMs = played.tracks[0].played.to + FRAME_MS;
      for (const { row } of played.rows) {
        const { monotonicTimeMs, playbacks } = row.native.Transform;
        if (monotonicTimeMs >= takenMs) {
          expect(playbacks.length).toBe(0);
        }
      }
      expectModelOnFrames(caseName, played);
      for (const { Transform } of [played.end!.native, played.end!.frame]) {
        expect(Transform.model[12]).toBe(80);
        expect(Transform.model[13]).toBe(60);
      }
      await render(null);
    }
  );
});

/** The native box plays `operations`, and its twin is frame-driven. */
const transformPairOf = (operations: Operation[]) => ({
  nativeLayout: layoutOf({}, { name: 'native', transform: { operations } }),
  frameLayout: frameDrivenOf(
    layoutOf({}, { name: 'frame', transform: { operations } })
  ) as LayoutAnimationFunction,
});

const tagsOf = () => ({
  native: getTestComponent(BOX_REF).getTag(),
  frame: getTestComponent(FRAME_BOX_REF).getTag(),
});

async function samplePair() {
  const tags = tagsOf();
  const [native, frame] = await Promise.all([
    sample(tags.native, 'Transform'),
    sample(tags.frame, 'Transform'),
  ]);
  return { native, frame };
}

async function takeTraceOfPair() {
  const tags = tagsOf();
  const events = (await takeTrace()).filter(
    ({ event }) => event !== 'FrameUpdateMounted'
  );
  return {
    native: events.filter(({ tag }) => tag === tags.native),
    frame: events.filter(({ tag }) => tag === tags.frame),
  };
}

const sortedCallbacks = () => callbacks.slice().sort().join();

/** The tolerance of a `Transform` model of a box against its frame-driven twin. */
const TWIN_TOLERANCE = { cells: 0.005, translation: 0.25 };

const isNearTwin = (model: number[], twinModel: number[]) =>
  model.length === twinModel.length &&
  model.every(
    (cell, index) =>
      Math.abs(cell - twinModel[index]) < cellToleranceOf(index, TWIN_TOLERANCE)
  );

describe('native layout operation timelines and a live size track', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const SIZE_MS = 2000;
  const size = {
    nativeLayout: layoutOf(
      { width: { duration: SIZE_MS } },
      { name: 'nativeSize' }
    ),
    frameLayout: frameDrivenOf(
      layoutOf({ width: { duration: SIZE_MS } }, { name: 'frameSize' })
    ),
  };
  const operations: Operation[] = [
    ['rotate', '0deg', '90deg', { duration: 400 }],
    ['translateX', 0, 40, { duration: 800 }],
  ];
  const box = {
    top: 60,
    style: { transform: endTransformOf(operations) },
    inRow: true,
  };

  async function startWidth() {
    await mountScene(
      <SizePair left={START_LEFT} width={60} {...box} {...size} />
    );
    await render(<SizePair left={START_LEFT} width={120} {...box} {...size} />);
    await wait(500);
    const events = await takeTraceOfPair();
    const before = await samplePair();
    callbacks.length = 0;
    return { events, before };
  }

  const startTransform = () =>
    render(
      <SizePair
        left={END_LEFT}
        width={120}
        {...box}
        {...transformPairOf(operations)}
      />
    );

  if (PLAYS_SIZE_CHANGE) {
    test('a transform with two timelines starts natively on a view with a live width track of an earlier build, and the width track stays live', async () => {
      const { before } = await startWidth();
      expect(before.native.playbacks.length).toBe(1);
      await startTransform();
      await wait(250);
      const trace = summarize((await takeTraceOfPair()).native);
      expect(
        trace.startsWith(
          'LayoutLeafCaptured:Width > LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Transform > Admitted'
        )
      ).toBe(true);
      expect(trace.includes('TrackEnded')).toBe(false);
      const during = await samplePair();
      expect(during.native.playbacks.length).toBe(2);
      expect(
        playbackIdsOf(during.native).includes(
          playbackIdOf(before.native.playbacks[0])
        )
      ).toBe(true);
      expect(propertiesOf(during.native.members)).toBe(
        PLAYS_CORE_ANIMATION_MEMBERS
          ? 'transform,transform.translateX,transform.rotateZ'
          : 'transform.rotateZ,transform.translateX'
      );
      await wait(2200);
      const end = await samplePair();
      expect(sortedCallbacks()).toBe(
        'frame:true,frameSize:false,native:true,nativeSize:false'
      );
      expect(end.native.playbacks.length).toBe(0);
      expect(
        largestCellDifference(end.native.model, end.frame.model) < 0.01
      ).toBe(true);
      await render(null);
    });
  } else {
    test('a width change stays frame-driven with UnsupportedTarget, a later transform with two timelines on the view stays frame-driven, and the view has the model of its frame-driven twin', async () => {
      const width = await startWidth();
      expect(summarize(width.events.native.filter(isHostEvent))).toBe(
        'LayoutBuildFailed:UnsupportedTarget'
      );
      expect(width.before.native.playbacks.length).toBe(0);
      const startMs = performance.now();
      await startTransform();
      const reads: Awaited<ReturnType<typeof samplePair>>[] = [];
      for (const atMs of [250, 450]) {
        await wait(Math.max(0, startMs + atMs - performance.now()));
        reads.push(await samplePair());
      }
      const transformEvents = (await takeTraceOfPair()).native;
      expect(summarize(transformEvents.filter(isHostEvent))).toBe('');
      const models = reads.map(({ native }) => native.model.join());
      expect(new Set(models).size).toBe(reads.length);
      for (const { native, frame } of reads) {
        expect(native.playbacks.length).toBe(0);
        expect(isNearTwin(native.model, frame.model)).toBe(true);
      }
      await wait(2200);
      const end = await samplePair();
      expect(sortedCallbacks()).toBe(
        'frame:true,frameSize:false,native:true,nativeSize:false'
      );
      expect(end.native.playbacks.length).toBe(0);
      expect(isNearTwin(end.native.model, end.frame.model)).toBe(true);
      await render(null);
    });
  }
});

const ENTER_REF_STYLE = { width: 100, height: 60 };

function EnteringBox({
  refName,
  entering,
  style,
}: {
  refName: string;
  entering: unknown;
  style: ViewStyle;
}) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      entering={entering as never}
      style={[styles.sizeBox, ENTER_REF_STYLE, { marginLeft: 60 }, style]}
    />
  );
}

function EnteringPair({
  isMounted,
  native,
  frame,
  style,
}: {
  isMounted: boolean;
  native: unknown;
  frame: unknown;
  style: ViewStyle;
}) {
  return (
    <View style={styles.sizeRow}>
      <View style={[styles.sizeCell, styles.sizeRowCell]}>
        {isMounted && (
          <EnteringBox refName={BOX_REF} entering={native} style={style} />
        )}
      </View>
      <View style={[styles.sizeCell, styles.sizeRowCell]}>
        {isMounted && (
          <EnteringBox refName={FRAME_BOX_REF} entering={frame} style={style} />
        )}
      </View>
    </View>
  );
}

describe('native layout operation timelines of a keyframe animation', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'a keyframe animation with other points for its two operations plays natively: each member has the keys of its own points, and one callback comes at the end',
    async () => {
      const DURATION = 1000;
      const keyframeOf = (name: string) =>
        new Keyframe({
          0: { transform: [{ scale: 0.5 }, { rotate: '0deg' }] },
          40: { transform: [{ scale: 1.2 }] },
          100: { transform: [{ scale: 1 }, { rotate: '90deg' }] },
        } as ConstructorParameters<typeof Keyframe>[0])
          .duration(DURATION)
          .withCallback(callbackOf(name));
      const pair = {
        native: keyframeOf('native'),
        frame: frameDrivenOf(
          keyframeOf('frame') as unknown as Parameters<typeof frameDrivenOf>[0]
        ),
        style: { transform: [{ scale: 1 }, { rotate: '90deg' }] } as ViewStyle,
      };
      await render(<EnteringPair {...pair} isMounted={false} />);
      await wait(200);
      await takeTrace();
      callbacks.length = 0;
      const startMs = performance.now();
      const waitUntil = (elapsedMs: number) =>
        wait(Math.max(0, startMs + elapsedMs - performance.now()));
      await render(<EnteringPair {...pair} isMounted />);
      await waitUntil(150);
      const events = await takeTraceOfPair();
      expect(summarizeStart(events.native)).toBe(TRANSFORM_START);
      expect(summarize(events.frame)).toBe(
        'LayoutBuildFailed:UnsupportedTiming'
      );
      const { members } = (await samplePair()).native;
      if (PLAYS_CORE_ANIMATION_MEMBERS) {
        expect(members.map(({ property }) => property).join()).toBe(
          'transform,transform.rotateZ,transform.scale'
        );
        expectNear(members[1].keyTimes, [0, 1]);
        expectNear(valuesOf(members[1]), [0, Math.PI / 2]);
        expectNear(members[2].keyTimes, [0, 0.4, 1]);
        expectNear(valuesOf(members[2]), [0.5, 1.2, 1]);
      } else {
        expectListOrderMembers(members, [
          { kind: 'scale', keyTimes: [0, 0.4, 1], values: [0.5, 1.2, 1] },
          { kind: 'rotateZ', keyTimes: [0, 1], values: [0, Math.PI / 2] },
        ]);
      }

      await waitUntil(DURATION - 6 * FRAME_MS);
      expect(callbacks.filter((each) => each.startsWith('native')).length).toBe(
        0
      );
      await waitUntil(DURATION + 300);
      const end = await samplePair();
      expect(end.native.playbacks.length).toBe(0);
      expect(
        largestCellDifference(end.native.presentation, end.frame.model) < 0.01
      ).toBe(true);
      expect(summarizeAfterStart((await takeTraceOfPair()).native)).toBe(
        TRANSFORM_END
      );
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      await render(null);
    }
  );
});
