/*
 * The player of the native layout suites: it plays a case on the native box and on its frame-driven twin
 * and has statements A and B of `native layout reference` for what it played.
 *
 * The record of the checked reads. The kit marks the first row of each sampling cycle. For each target with
 * a track the player prints one `TIMELINE` row: the window (the part of the checked time of the target from
 * the first read to the last read), the checked time after the last read, the count of the checked reads,
 * the count of the cycles in the window with their longest spacing, and the exempt time (the sum of the gaps
 * of `READ_GAP_MS` or more between two reads that have a part in the window, each with the time of the read
 * after it). Each read of the target that statement A does not check is in a `READ-UNCHECKED` row with its
 * reason, one row for each run of such reads with one reason. The gates: statement A for each checked read,
 * and the existence gate (a target with a track and with no checked read fails in each condition). A target
 * whose declared timelines have no duration has no checked time: its `TIMELINE` row says "not tested", and
 * the gate does not apply.
 *
 * The record does not prove: a rate (one read for each display frame, or one cycle for each interval of the
 * sampler); a read in a gap of `READ_GAP_MS` or more; a read in the checked time after the last read; a
 * bound on a cycle spacing under `READ_GAP_MS`. The count of the checked reads and the count of the cycles
 * are records of the run and not requirements.
 */
import React from 'react';
import type { ViewStyle } from 'react-native';
import { PixelRatio, StyleSheet, View } from 'react-native';
import type Animated from 'react-native-reanimated';
import { Easing, Keyframe } from 'react-native-reanimated';

import {
  expect,
  getTestComponent,
  render,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  AnimationSource,
  Band,
  Capture,
  DeclaredKey,
  FrameCheck,
  FrameMatrix,
  FrameRecord,
  FrameResidual,
  Leaf,
  Leaves,
  MatrixTolerance,
  ModelWait,
  NativeRead,
  Operation,
  PlayedTrack,
  ScalarKey,
  ScalarTrack,
  ScrollViewRef,
  SizeBoxProps,
  TakenRow,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  amountOf,
  BOX_REF,
  BOX_SIZE,
  callbackOf,
  callbacks,
  capturedResidualOf,
  capturesOf,
  cellToleranceOf,
  ClippingScrollView,
  declaredBandOf,
  declaredDurationOf,
  declaredEndOf,
  declaredOf,
  declaredSidesOf,
  declaredTimelineOf,
  describeLeaf,
  endCellsOf,
  endTransformOf,
  entryExitOf,
  expectCapturedStart,
  expectFrameTimeline,
  expectNativeReadRows,
  FRAME_BOX_REF,
  FRAME_MS,
  frameDrivenOf,
  frameMatricesOf,
  frameRecordedOf,
  isOfCommand,
  isOperationRecord,
  isSameLeaf,
  isScalarTrack,
  layerOf,
  layoutOf,
  middleOf,
  modelWaits,
  narrowClockOffset,
  OPACITY_TOLERANCE,
  ownerAt,
  playbackIdOf,
  playbackIdsOf,
  PAIR_LEFT,
  PAIR_TOP,
  playedTracksOf,
  POSITION_TOLERANCE,
  PRESENTATION_STAY_MS,
  READ_GAP_MS,
  readFrameRecords,
  REMOVAL_LEAD_MS,
  resetCallbacks,
  resetFrameRecords,
  residualInBandOf,
  sample,
  shownAtRestOf,
  SizeBox,
  START_LEFT,
  styles,
  summarize,
  takeRows,
  takeTrace,
  uncertaintyOf,
  waitForCallbacks,
} from './nativeLayoutTestKit';

export type BoxName = 'native' | 'frame';
type Flow = 'layout' | 'entering' | 'exiting';
type Animations = Pick<React.ComponentProps<typeof Animated.View>, Flow>;
export type Place = {
  left: number;
  top: number;
  opacity?: number;
  width?: number;
  height?: number;
  borderRadius?: number;
};

/** What the animation of a commit declares. */
type Declaration = {
  leaves: Leaves;
  operations?: Operation[];
  /**
   * The native route has no form of the animation: the frame driver plays the
   * two boxes.
   */
  isFrameDriven?: boolean;
};

export type ReferenceCase = Declaration & {
  flow: Flow;
  /**
   * The place of the boxes before the first commit, then after each commit. The
   * boxes are not mounted where there is no place.
   */
  places: (Place | undefined)[];
  /**
   * The time of each commit after the first, from the first. It comes while the
   * animations of the commit before it play.
   */
  commitTimesMs?: number[];
  /** The time of the animations after the last commit. */
  totalMs: number;
  /**
   * The animation of the native box before its callback, when `layoutOf` does
   * not make the animations. The twin has it with no native description.
   */
  builder?: () => CallbackBuilder;
  /** The animation of each commit after the first, when it is another one. */
  replacement?: Declaration;
  /** The host component and the static style of each box. */
  box?: Pick<SizeBoxProps, 'host' | 'style'> & {
    /** The component of each box, when it is not `SizeBox`. */
    Box?: React.ComponentType<SizeBoxProps>;
  };
  /** Targets with no declared key that each row has a sample of. */
  alsoSampled?: string[];
  /** The tolerance of a `Transform` sample, when it is not `MATRIX_TOLERANCE`. */
  matrixTolerance?: MatrixTolerance;
  restyle?: Restyle;
  /**
   * The boxes are in a clipping host. A scroll takes them out of its window at
   * `atMs` from the first commit, and a scroll brings them back at `backAtMs`.
   * The native route gives the box to the frame driver, and each leaf goes on.
   * The platform removes the animations before the end report of a track, so no
   * read from the first row after the scroll call is checked by statement A:
   * the native presentation has no statement there, as after a write.
   */
  clip?: { atMs: number; backAtMs: number };
  write?: Write;
  /** A statement of the test at a time from the first commit. */
  checkpoint?: { atMs: number; run: () => void };
};

export type ModelTarget = 'Opacity' | 'Transform';

/**
 * A write of the test on the model of `targets` of the two boxes: at `atMs`
 * from the first commit, or before the last commit when it has no time. The
 * model of a written target is not the end value of its declaration, so the
 * test has the statements of its end. The play waits for the promise of `run`
 * before its next step and takes no row in that time: a case whose next step
 * must follow the write in the model returns `waitForModel` there, and each
 * such wait is a `WRITE-MODEL` row. The model of a box follows the frames of
 * the frame driver while it plays the target: a wait for it there does not show
 * the write.
 */
export type Write = {
  atMs?: number;
  targets: readonly ModelTarget[];
  run: () => void | Promise<unknown>;
};

/**
 * A render of the boxes in their place with another static style, at a time
 * from the first commit, during the animations of the last commit. The layout
 * does not change, so the twin has no build, and the test has the statements of
 * the transform at the end.
 */
export type Restyle = {
  atMs: number;
  transform?: ViewStyle['transform'];
  style?: SizeBoxProps['style'];
  /**
   * The native route gives the box to the frame driver: the builder of the
   * native box runs again, and each leaf goes on from the start that it had.
   */
  handsOver?: boolean;
};

// The type of a Keyframe does not show its `build`.
export type CallbackBuilder = {
  withCallback: (callback: (finished: boolean) => void) => AnimationSource;
};

const START: Place = { left: START_LEFT, top: 0 };
const END: Place = { left: PAIR_LEFT, top: PAIR_TOP };
const OVERSHOOT = Easing.out(Easing.back(1.7));
const SHEAR = [1, 0, 0, 0, 0.2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const KEYFRAME_POINTS: Leaf = {
  initial: 0.1,
  to: 1,
  duration: 300,
  via: [
    { level: 0.8, duration: 300, easing: Easing.quad },
    { level: 0.3, duration: 400 },
  ],
};

const timingOf = (easing: Leaf['easing']): ReferenceCase => ({
  flow: 'layout',
  leaves: {
    originX: { duration: 1500, easing },
    originY: { duration: 1500 },
    opacity: { duration: 1500, easing, initial: 1, to: 0.2 },
  },
  places: [START, { ...END, opacity: 0.2 }],
  totalMs: 1500,
});

/** One case for each class of animation that the native suites play. */
export const REFERENCE_CASES: Record<string, ReferenceCase> = {
  'a timing with a linear easing': timingOf(Easing.linear),
  'a timing with a Bezier easing': timingOf(Easing.bezier(0.25, 0.1, 0.25, 1)),
  'a timing with a fitted easing': timingOf(OVERSHOOT),
  'a delay': {
    flow: 'layout',
    leaves: {
      originX: { duration: 900, delays: [400], easing: 'default' },
      originY: { duration: 1300 },
    },
    places: [START, END],
    totalMs: 1300,
  },
  'a delay of no duration': {
    flow: 'layout',
    leaves: {
      originX: { duration: 900, delays: [0], easing: 'default' },
      originY: { duration: 900 },
    },
    places: [START, END],
    totalMs: 900,
  },
  'a sequence': {
    flow: 'layout',
    leaves: {
      originX: {
        duration: 500,
        via: [
          { level: 0.7, duration: 400, easing: 'default' },
          { level: 0.3, duration: 300, delay: 200 },
        ],
      },
      originY: { duration: 1400 },
    },
    places: [START, END],
    totalMs: 1400,
  },
  'a sequence that comes back to its start value': {
    flow: 'exiting',
    leaves: {
      originX: { duration: 1200, to: 80 },
      opacity: {
        initial: 1,
        to: 1,
        duration: 400,
        via: [
          { to: 0.4, duration: 500, easing: 'default' },
          { to: 0.5, duration: 300 },
        ],
      },
    },
    places: [END, undefined],
    totalMs: 1200,
  },
  'a sequence with timings of no duration': {
    flow: 'layout',
    leaves: {
      originX: {
        duration: 300,
        via: [
          { level: 0.5, duration: 0 },
          { level: 0.2, duration: 400 },
          { level: 0.6, duration: 0 },
          { level: 0.9, duration: 0, delay: 100 },
        ],
      },
    },
    places: [START, { ...START, left: PAIR_LEFT }],
    totalMs: 800,
    isFrameDriven: true,
  },
  'a keyframe animation': {
    flow: 'entering',
    leaves: { opacity: KEYFRAME_POINTS },
    places: [undefined, END],
    totalMs: 1000,
    builder: () => opacityKeyframeOf(KEYFRAME_POINTS),
  },
  'transform operations': {
    flow: 'layout',
    leaves: {},
    operations: [
      ['translateX', 0, 80, { duration: 1200 }],
      ['scale', 0.5, 1, { duration: 600, delays: [300], easing: 'default' }],
    ],
    places: [START, END],
    totalMs: 1200,
  },
  'a rotation': {
    flow: 'layout',
    leaves: {},
    operations: [['rotate', '0deg', '90deg', { duration: 1200 }]],
    places: [START, END],
    totalMs: 1200,
  },
  'two operations of one kind': {
    flow: 'layout',
    leaves: {},
    operations: [
      ['rotate', '0deg', '60deg', { duration: 1200 }],
      ['rotate', '10deg', '40deg', { duration: 600, easing: 'default' }],
    ],
    places: [START, END],
    totalMs: 1200,
  },
  'a perspective': {
    flow: 'layout',
    leaves: {},
    operations: [
      ['perspective', 40, 40, { duration: 1200 }],
      ['rotateX', '60deg', '0deg', { duration: 1200 }],
    ],
    places: [START, END],
    totalMs: 1200,
  },
  'a matrix operation': {
    flow: 'layout',
    leaves: { originX: { duration: 800 } },
    operations: [['matrix', SHEAR, SHEAR, { isPlain: true }]],
    places: [START, { ...START, left: PAIR_LEFT }],
    totalMs: 800,
    isFrameDriven: true,
  },
  'a transform replacement': {
    flow: 'layout',
    leaves: {},
    operations: [
      ['translateX', 0, 80, { duration: 1200 }],
      ['translateY', 0, 60, { duration: 1200, easing: 'default' }],
    ],
    replacement: {
      leaves: {},
      operations: [
        ['translateX', 50, 10, { duration: 900 }],
        ['translateY', 30, 0, { duration: 600 }],
      ],
    },
    places: [START, END, START],
    commitTimesMs: [500],
    totalMs: 900,
  },
  'a size': {
    flow: 'layout',
    leaves: {
      width: { duration: 1200 },
      height: { duration: 1200, easing: 'default' },
    },
    places: [START, { ...START, width: 120, height: 90 }],
    totalMs: 1200,
  },
  'a position change and a size change': {
    flow: 'layout',
    leaves: {
      originX: { duration: 1200, easing: 'default' },
      originY: { duration: 900 },
      width: { duration: 600, delays: [300] },
      height: { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
    },
    places: [START, { ...END, width: 100.3, height: 80.3 }],
    totalMs: 1200,
  },
  'a border radius': {
    flow: 'layout',
    leaves: {
      originX: { duration: 800 },
      borderRadius: { duration: 800, initial: 0, to: 20 },
    },
    places: [START, { ...START, left: PAIR_LEFT, borderRadius: 20 }],
    totalMs: 800,
    isFrameDriven: true,
  },
  'an entering animation': {
    flow: 'entering',
    leaves: {
      opacity: { duration: 1200, initial: 0.2, to: 1 },
      originX: { duration: 1200, initial: -80, easing: 'default' },
    },
    places: [undefined, END],
    totalMs: 1200,
  },
  'an exiting animation': {
    flow: 'exiting',
    leaves: {
      opacity: { duration: 1200, initial: 1, to: 0.2 },
      originX: { duration: 1200, to: 80, easing: 'default' },
    },
    places: [END, undefined],
    totalMs: 1200,
  },
  'a replacement': {
    flow: 'layout',
    leaves: { originX: { duration: 1500 }, originY: { duration: 1500 } },
    places: [START, END, { ...END, left: PAIR_LEFT / 4 }],
    commitTimesMs: [500],
    totalMs: 1500,
  },
  'a new X with a kept width': {
    flow: 'layout',
    leaves: { originX: { duration: 1500 }, width: { duration: 1500 } },
    places: [
      START,
      { ...START, left: PAIR_LEFT, width: 120 },
      { ...START, left: PAIR_LEFT / 4, width: 120 },
    ],
    commitTimesMs: [500],
    totalMs: 1500,
  },
  'a new width with a kept X': {
    flow: 'layout',
    leaves: { originX: { duration: 1500 }, width: { duration: 1500 } },
    places: [
      START,
      { ...START, left: PAIR_LEFT, width: 120 },
      { ...START, left: PAIR_LEFT, width: 60 },
    ],
    commitTimesMs: [500],
    totalMs: 1500,
  },
  'a replacement with a new duration and easing': {
    flow: 'layout',
    leaves: { originX: { duration: 1500 }, originY: { duration: 1500 } },
    replacement: {
      leaves: {
        originX: { duration: 900, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
        originY: { duration: 900 },
      },
      isFrameDriven: true,
    },
    places: [START, { ...START, left: PAIR_LEFT }, END],
    commitTimesMs: [500],
    totalMs: 900,
  },
  'a replacement with a delay': {
    flow: 'layout',
    leaves: { originX: { duration: 1500 } },
    replacement: {
      leaves: { originX: { duration: 600, delays: [300] } },
      isFrameDriven: true,
    },
    places: [
      START,
      { ...START, left: PAIR_LEFT },
      { ...START, left: PAIR_LEFT / 4 },
    ],
    commitTimesMs: [500],
    totalMs: 900,
  },
  'a hand-over to the frame driver': {
    flow: 'layout',
    leaves: {
      originX: { duration: 1800, onlyWhenChanged: true },
      originY: { isSpring: true, onlyWhenChanged: true },
    },
    places: [START, { ...START, left: PAIR_LEFT }, END],
    commitTimesMs: [600],
    totalMs: 1800,
  },
};

type Reader = Pick<ScalarKey, 'target' | 'tolerance'> & {
  /** Of a position key: the size key of its axis. */
  sizeKey?: string;
};

export const MATRIX_TOLERANCE: MatrixTolerance = {
  cells: 0.005,
  translation: POSITION_TOLERANCE,
};

export const matrixToleranceOf = ({ matrixTolerance }: ReferenceCase) =>
  matrixTolerance ?? MATRIX_TOLERANCE;

const READERS: Record<string, Reader> = {
  originX: {
    target: 'PositionX',
    tolerance: POSITION_TOLERANCE,
    sizeKey: 'width',
  },
  originY: {
    target: 'PositionY',
    tolerance: POSITION_TOLERANCE,
    sizeKey: 'height',
  },
  width: { target: 'Width', tolerance: POSITION_TOLERANCE },
  height: { target: 'Height', tolerance: POSITION_TOLERANCE },
  opacity: { target: 'Opacity', tolerance: OPACITY_TOLERANCE },
  borderRadius: { target: 'BorderRadius', tolerance: POSITION_TOLERANCE },
};

/** The property of the shadow tree of each layout key. */
const LAYOUT_PROPS = {
  originX: 'left',
  originY: 'top',
  width: 'width',
  height: 'height',
} as const;

type LayoutKey = keyof typeof LAYOUT_PROPS;

const LAYOUT_KEYS = Object.keys(LAYOUT_PROPS) as LayoutKey[];

const isLayoutKey = (key: string): key is LayoutKey => key in LAYOUT_PROPS;

/** A frame check with the key that its leaf declares. */
export type LeafCheck = FrameCheck & {
  declared: DeclaredKey;
  replaced?: LeafCheck;
};

export type Samples = Record<BoxName, Record<string, TargetSample>>;

/**
 * A fractional number of a layout key of a place of a case, with the value that
 * the layout gave to the key of each box at rest in the place.
 */
export type MountedValue = {
  key: string;
  place: number;
  declared: number;
  laidOut: Record<BoxName, number>;
};

export type Played = {
  /**
   * The time at which the render of the first commit resolved, of
   * `performance.now`.
   */
  startMs: number;
  rows: TakenRow<Samples>[];
  /** Before the first commit, when the boxes are mounted. */
  start?: Samples;
  /** After the callbacks, when the boxes are mounted. */
  end?: Samples;
  mounted: MountedValue[];
  tracks: PlayedTrack[];
  /** The trace of the native box from the first commit. */
  events: TraceEvent[];
  captures: Capture[];
  frameChecks: LeafCheck[];
  /** Each record of the frame driver from the mount of the case. */
  frameRecords: FrameRecord[];
  /** The last declaration of each key that has a timeline. */
  endKeys: DeclaredKey[];
  clockOffset: Band;
  /** What the callbacks do not have of `expectedCallbacksOf`. */
  missingCallbacks: string;
  /** Each wait of a write of the case for its model. */
  modelWaits: (ModelWait & { box?: BoxName })[];
};

const CLOCK_REF = 'NativeLayoutReferenceClock';
const BOXES: Record<BoxName, string> = {
  native: BOX_REF,
  frame: FRAME_BOX_REF,
};
const BOX_NAMES = Object.keys(BOXES) as BoxName[];

/**
 * Plays a case on the native box and on its frame-driven twin, with rows of
 * samples of the two boxes from the first commit to the end.
 */
export async function play(referenceCase: ReferenceCase): Promise<Played> {
  const {
    places,
    commitTimesMs = [],
    totalMs,
    restyle,
    clip,
    write,
  } = referenceCase;
  const commits = places.slice(1).map((_, commit) => commit);
  const animations = commits.map((commit) =>
    animationsOf(referenceCase, commit)
  );
  const sceneOf = (commit: number, place?: Place, restyled?: Restyle) => (
    <ReferenceScene
      animations={animations[commit]}
      place={place}
      transform={restyled?.transform ?? transformOf(referenceCase, commit)}
      box={{
        ...referenceCase.box,
        style: [referenceCase.box?.style, restyled?.style],
      }}
      clips={clip !== undefined}
    />
  );
  const targets = targetsOf(referenceCase);
  resetFrameRecords();
  modelWaits.length = 0;
  await render(sceneOf(0, places[0]));
  await wait(200);
  const clockOffset = await narrowClockOffset(
    getTestComponent(CLOCK_REF).getTag()
  );
  await takeTrace();
  resetCallbacks();
  const mountedTags = places[0] && tagsOf();
  const atStart = mountedTags && (await takeSamples(targets, mountedTags));
  const layoutsAtStart = mountedTags && (await shadowLayoutsOf());

  const rows: TakenRow<Samples>[] = [];
  let rowsBeforeClip: number | undefined;
  const steps = stepsOf(referenceCase, {
    restyle: (commit) => render(sceneOf(commit, places[commit + 1], restyle)),
    clip: () => {
      rowsBeforeClip = rows.length;
      scrollTo(CLIPPED_OFFSET);
    },
  });
  let startMs = 0;
  let tags = mountedTags;
  for (const commit of commits) {
    const isLast = commit === commits.length - 1;
    if (isLast && write && write.atMs === undefined) {
      const written = write.run();
      if (written) {
        await written;
      }
    }
    await render(sceneOf(commit, places[commit + 1]));
    startMs ||= performance.now();
    tags ??= tagsOf();
    const commitTags = tags;
    const takeRowsUntil = async (untilMs: number) => {
      rows.push(
        ...(await takeRows(
          () => takeSamples(targets, commitTags),
          ({ native }) => native[targets[0]],
          untilMs
        ))
      );
    };
    const endMs =
      commitTimesMs[commit] ?? (lastOf(commitTimesMs) ?? 0) + totalMs;
    while (steps.length > 0 && (isLast || steps[0].atMs < endMs)) {
      const { atMs, run } = steps.shift()!;
      await takeRowsUntil(startMs + atMs);
      await run(commit);
    }
    await takeRowsUntil(startMs + endMs);
  }
  const missingCallbacks = await waitForCallbacks(
    expectedCallbacksOf(referenceCase)
  );
  const end = lastOf(places) && (await takeSamples(targets, tags!));
  const events = (await takeTrace()).filter(({ tag }) => tag === tags!.native);
  const layoutsAtEnd = lastOf(places) && (await shadowLayoutsOf());
  const mounted = mountedValuesOf(places, [layoutsAtStart, layoutsAtEnd]);
  const builtKeys = buildsOf(referenceCase, mounted);
  const declaredKeys = builtKeys.flat().map(({ declared }) => declared);
  const clippedRow =
    rowsBeforeClip === undefined ? undefined : rows[rowsBeforeClip];
  const tracks = tracksOf(
    referenceCase,
    builtKeys,
    events,
    clockOffset,
    rows,
    clippedRow?.row.native[targets[0]].monotonicTimeMs
  );
  const frameRecords = readFrameRecords();
  const frameChecks = frameChecksOf(builtKeys.flat(), frameRecords);
  return {
    startMs,
    rows,
    start: atStart,
    end,
    mounted,
    tracks,
    events,
    captures: capturesOf(events, tracks, clockOffset, (track) =>
      frameDriverOriginOf(track, frameChecks, clockOffset)
    ),
    frameChecks,
    frameRecords,
    endKeys: declaredKeys.filter(
      (key, index) =>
        !declaredKeys.slice(index + 1).some((later) => isSameLeaf(later, key))
    ),
    clockOffset,
    missingCallbacks,
    modelWaits: modelWaits.map((modelWait) => ({
      ...modelWait,
      box: BOX_NAMES.find((box) => tags![box] === modelWait.tag),
    })),
  };
}

type Step = { atMs: number; run: (commit: number) => void | Promise<unknown> };

function stepsOf(
  { restyle, clip, write, checkpoint, commitTimesMs = [] }: ReferenceCase,
  run: { restyle: Step['run']; clip: Step['run'] }
): Step[] {
  const steps: Step[] = [];
  if (restyle) {
    if (restyle.atMs < (lastOf(commitTimesMs) ?? 0)) {
      throw new Error(
        `The restyle at ${restyle.atMs} ms is before the last commit of the case.`
      );
    }
    steps.push({ atMs: restyle.atMs, run: run.restyle });
  }
  if (clip) {
    steps.push(
      { atMs: clip.atMs, run: run.clip },
      { atMs: clip.backAtMs, run: () => scrollTo(0) }
    );
  }
  if (write?.atMs !== undefined) {
    steps.push({ atMs: write.atMs, run: write.run });
  }
  if (checkpoint) {
    steps.push(checkpoint);
  }
  return steps.sort((first, second) => first.atMs - second.atMs);
}

const scrollRef: ScrollViewRef = React.createRef();
const CLIPPED_OFFSET = 1500;
function scrollTo(y: number) {
  if (!scrollRef.current) {
    throw new Error('The scene has no clipping host to scroll.');
  }
  scrollRef.current.scrollTo({ y, animated: false });
}

/**
 * The value that the layout gave to each fractional number of a layout key of
 * the first place and of the last place of a case, from the shadow tree of each
 * box at rest in the place: `first` before the first commit, `last` after the
 * callbacks. The layout rounds a fractional number to the pixel grid, so the
 * number of the case is not the value that an animation gets, and the two boxes
 * can get two values for one number.
 */
function mountedValuesOf(
  places: (Place | undefined)[],
  [first, last]: (Layouts | undefined)[]
): MountedValue[] {
  return places.flatMap((place, index) => {
    const rest = place && restOf(place);
    const fractional = LAYOUT_KEYS.filter(
      (key) => rest && !Number.isInteger(rest[key])
    );
    const atRest =
      index === 0 ? first : index === places.length - 1 ? last : undefined;
    if (fractional.length > 0 && !atRest) {
      throw new Error(
        `The kit has no view at rest in the place ${index} for its fractional values of ${fractional.join()}.`
      );
    }
    return fractional.map(
      (key): MountedValue => ({
        key,
        place: index,
        declared: rest![key],
        laidOut: { native: atRest!.native[key], frame: atRest!.frame[key] },
      })
    );
  });
}

type Layouts = Record<BoxName, Record<LayoutKey, number>>;

async function shadowLayoutsOf(): Promise<Layouts> {
  const layoutOf = async (refName: string) => {
    const component = getTestComponent(refName);
    const values: Partial<Record<LayoutKey, number>> = {};
    for (const key of LAYOUT_KEYS) {
      values[key] = Number(await component.getAnimatedStyle(LAYOUT_PROPS[key]));
    }
    return values as Record<LayoutKey, number>;
  };
  return {
    native: await layoutOf(BOX_REF),
    frame: await layoutOf(FRAME_BOX_REF),
  };
}

const restsOf = (
  places: (Place | undefined)[],
  mounted: MountedValue[],
  box: BoxName
) =>
  places.map(
    (place, index) =>
      place && {
        ...restOf(place),
        ...Object.fromEntries(
          mounted
            .filter((value) => value.place === index)
            .map(({ key, laidOut }) => [key, laidOut[box]])
        ),
      }
  );

/**
 * The origin on the sample clock of the build that gave a track to the frame
 * driver: the start call of the record of the native box that replaced the
 * record of the track.
 */
function frameDriverOriginOf(
  track: ScalarTrack,
  frameChecks: LeafCheck[],
  clockOffset: Band
) {
  const start = frameChecks.find(
    ({ record, replaced }) =>
      record.box === 'native' && replaced?.declared === track.declaration
  )?.record.start;
  if (!start) {
    throw new Error(
      `The frame driver has no start call of the build that took ${describeLeaf(track)} of the command ${track.generation}.`
    );
  }
  return start.timeMs + middleOf(clockOffset);
}

/**
 * Each animation gives its callback `true` one time, after one `false` for each
 * commit that came during it.
 */
export const expectedCallbacksOf = ({ places, restyle }: ReferenceCase) => [
  ...(restyle?.handsOver ? ['native:false'] : []),
  ...(Object.keys(BOXES) as BoxName[]).flatMap((box) =>
    places.slice(1).map((_, commit) => `${box}:${commit === places.length - 2}`)
  ),
];

/**
 * Statements A and B of `native layout reference` for a played case, and its
 * end: each sample of the native box and each frame of the two boxes is on the
 * declared timeline, each captured value is on its track, each animation gave
 * its callbacks, and each box rests at its end values. It prints the residuals
 * as a `REFERENCE` row, each captured value as a `CAPTURE` row, each gate as a
 * `GATE` row, each checked read off the timeline as an `OFF` row, each checked
 * read after a gap that is off the band as a `STALE-READ` row, each read that
 * is on the timeline only in a removal window as a `REMOVAL-WINDOW` row, each
 * read that is on the timeline only by a held value of an edge of a segment as
 * an `EDGE-HOLD` row, each fractional number of a place with its two laid-out
 * values as a `MOUNTED` row, the record of the reads of each target as
 * `READ-UNCHECKED` rows and a `TIMELINE` row, and each wait of a write for its
 * model as a `WRITE-MODEL` row. The largest age of the `REFERENCE` row is a
 * lower-bound estimate. The margin to 18 ms is not printed.
 */
export function expectReference(
  caseName: string,
  referenceCase: ReferenceCase,
  played: Played
) {
  for (const { key, place, declared, laidOut } of played.mounted) {
    console.log(
      `MOUNTED | ${caseName} | ${key} of the place ${place}: declared ${declared}, laid out ${laidOut.native} for the native box and ${laidOut.frame} for the twin`
    );
    for (const value of [laidOut.native, laidOut.frame]) {
      expect(Math.abs(value - declared) < 1 / PixelRatio.get()).toBe(true);
    }
  }
  const reads = expectNativeRows(played, matrixToleranceOf(referenceCase));
  expect(reads.some(({ isChecked }) => isChecked)).toBe(
    !referenceCase.isFrameDriven
  );
  expect(played.frameChecks.some(({ record }) => record.box === 'frame')).toBe(
    true
  );
  const residuals = [
    ...describeNativeReads(reads, played),
    ...describeFrameRecords(expectFrameRecords(played)),
    `captured values ${played.captures.length}`,
  ];
  played.captures.forEach(expectCapturedStart);
  expectEnd(referenceCase, played);
  console.log(['REFERENCE', caseName, ...residuals].join(' | '));
  for (const capture of describeCaptures(played.captures)) {
    console.log(['CAPTURE', caseName, capture].join(' | '));
  }
  for (const gate of [
    ...describeGates(reads),
    ...describeReplacementReads(reads),
  ]) {
    console.log(['GATE', caseName, gate].join(' | '));
  }
  expectTimelineRows(
    caseName,
    played.tracks,
    plannedReadsOf(played.rows),
    reads
  );
  for (const modelWait of describeModelWaits(played)) {
    console.log(['WRITE-MODEL', caseName, modelWait].join(' | '));
  }
  for (const read of describeReadsOffTimeline(reads, played)) {
    console.log(['OFF', caseName, read].join(' | '));
  }
  for (const read of describeReadsAfterGap(reads)) {
    console.log(['STALE-READ', caseName, read].join(' | '));
  }
  for (const read of describeRemovalWindowReads(reads)) {
    console.log(['REMOVAL-WINDOW', caseName, read].join(' | '));
  }
  for (const read of describeEdgeHoldReads(reads)) {
    console.log(['EDGE-HOLD', caseName, read].join(' | '));
  }
  for (const read of describeReplacedShownReads(reads)) {
    console.log(['REPLACED-SHOWN', caseName, read].join(' | '));
  }
  return reads;
}

/** The samples of one read of the native box. */
export type PlannedRead = {
  samples: Record<string, TargetSample>;
  /** The read is the first of a sampling cycle. */
  opensCycle: boolean;
};

export const plannedReadsOf = (rows: TakenRow<Samples>[]): PlannedRead[] =>
  rows.map(({ row, opensCycle }) => ({ samples: row.native, opensCycle }));

/** Why statement A has no check of a read of a target with a track. */
const DROP_REASONS = {
  beforeStart: 'before `TrackStarted` of its track',
  startGate: `in the first ${PRESENTATION_STAY_MS} ms of its track`,
  afterChecked:
    'from the end of the checked time of its track (a clip, or the removal lead of a written target)',
  afterEnd: 'after the end of its track',
};

function dropReasonOf(ofTarget: PlayedTrack[], timeMs: number) {
  const playing = ofTarget.filter(
    ({ played }) => timeMs >= played.from && timeMs < played.to
  );
  if (playing.length === 0) {
    return ofTarget.every(({ played }) => timeMs < played.from)
      ? DROP_REASONS.beforeStart
      : DROP_REASONS.afterEnd;
  }
  return playing.some(({ checkedToMs = Infinity }) => timeMs >= checkedToMs)
    ? DROP_REASONS.afterChecked
    : DROP_REASONS.startGate;
}

export type TimelineRows = {
  target: string;
  /** The `TIMELINE` row: the record of the checked reads of the target. */
  timeline: string;
  /**
   * A `READ-UNCHECKED` row for each run of reads of the target that follow one
   * another with no check of statement A for one reason.
   */
  unchecked: string[];
  /** The count of the reads with a check of statement A. */
  checked: number;
  /** The count of the reads in the window that open a sampling cycle. */
  cycles: number;
  /** The count of the gaps of `READ_GAP_MS` or more with a part in the window. */
  gaps: number;
  /** Each track of the target declares a timeline with no duration. */
  hasNoDuration: boolean;
};

/**
 * The record of the reads of each target of `tracks`: `reads` has the check of
 * statement A of each of `planned` that has one. The window of a target is the
 * part of its checked time from the first read to the last read. The counts are
 * of the rows: the record has no formula of a rate.
 */
export function describeTimelineRows(
  name: string,
  tracks: PlayedTrack[],
  planned: PlannedRead[],
  reads: NativeRead[]
): TimelineRows[] {
  const placeOf = (target: string, timeMs: number) => `${target} ${timeMs}`;
  const readAt = new Map(
    reads.map((read) => [placeOf(read.target, read.timeMs), read])
  );
  return [...new Set(tracks.map(({ target }) => target))].map((target) => {
    const ofTarget = tracks.filter((track) => track.target === target);
    const originMs = middleOf(ofTarget[0].origin);
    const fromOrigin = (timeMs: number) => (timeMs - originMs).toFixed(2);
    const taken = planned.flatMap(({ samples, opensCycle }) => {
      const timeMs = samples[target]?.monotonicTimeMs;
      return timeMs === undefined
        ? []
        : [{ timeMs, opensCycle, read: readAt.get(placeOf(target, timeMs)) }];
    });
    const checked = taken.filter(({ read }) => read?.isChecked);
    const dropped: { reason: string; timesMs: number[] }[] = [];
    taken.forEach(({ timeMs, read }, index) => {
      if (read?.isChecked) {
        return;
      }
      const reason = dropReasonOf(ofTarget, timeMs);
      const last = dropped[dropped.length - 1];
      if (last?.reason === reason && !taken[index - 1].read?.isChecked) {
        last.timesMs.push(timeMs);
      } else {
        dropped.push({ reason, timesMs: [timeMs] });
      }
    });
    const checkedFromMs = Math.min(
      ...ofTarget.map(({ played, checkedFromMs: fromMs }) =>
        Math.max(played.from, fromMs)
      )
    );
    const checkedToMs = Math.max(
      ...ofTarget.map(({ played, checkedToMs: toMs = Infinity }) =>
        Math.min(played.to, toMs)
      )
    );
    const lastMs = taken[taken.length - 1]?.timeMs ?? -Infinity;
    const window = {
      from: Math.max(checkedFromMs, taken[0]?.timeMs ?? Infinity),
      to: Math.min(checkedToMs, lastMs),
    };
    const seen = taken.filter(
      ({ timeMs }) => timeMs >= window.from && timeMs <= window.to
    );
    const tail = `${Math.max(0, checkedToMs - lastMs).toFixed(2)} ms of the checked time after the last read`;
    const gaps = taken.slice(1).flatMap(({ timeMs }, index) => {
      const gapMs = timeMs - taken[index].timeMs;
      return gapMs >= READ_GAP_MS &&
        timeMs > window.from &&
        taken[index].timeMs < window.to
        ? [{ timeMs, gapMs }]
        : [];
    });
    const exemptMs = gaps.reduce((sum, { gapMs }) => sum + gapMs, 0).toFixed(2);
    const cycleTimesMs = seen
      .filter(({ opensCycle }) => opensCycle)
      .map(({ timeMs }) => timeMs);
    const spacingsMs = cycleTimesMs
      .slice(1)
      .map((timeMs, index) => timeMs - cycleTimesMs[index]);
    const hasNoDuration = ofTarget.every(
      ({ timeline }) => declaredDurationOf(timeline) === 0
    );
    const row =
      cycleTimesMs.length === 0
        ? [
            `${hasNoDuration ? 'not tested, the declared timeline of the target has no duration: ' : ''}no cycle in the window, checked reads ${checked.length}, ${exemptMs} ms exempt in ${gaps.length} gaps, ${tail}`,
          ]
        : [
            `window ${fromOrigin(window.from)} to ${fromOrigin(window.to)} ms from the origin of the track, ${(window.to - window.from).toFixed(2)} ms seen, ${tail}`,
            `checked reads ${checked.length} in ${cycleTimesMs.length} cycles, longest cycle spacing ${spacingsMs.length > 0 ? `${Math.max(...spacingsMs).toFixed(2)} ms` : 'none'}`,
            `exempt ${exemptMs} ms in ${gaps.length} gaps of ${READ_GAP_MS} ms or more${gaps.length > 0 ? ': ' : ''}${gaps.map(({ timeMs, gapMs }) => `${gapMs.toFixed(2)} ms at ${fromOrigin(timeMs)} ms`).join(', ')}`,
          ];
    return {
      target,
      timeline: ['TIMELINE', name, target, ...row].join(' | '),
      unchecked: dropped.map(({ reason, timesMs }) =>
        [
          'READ-UNCHECKED',
          name,
          target,
          reason,
          `${timesMs.length} reads, ${fromOrigin(timesMs[0])} to ${fromOrigin(timesMs[timesMs.length - 1])} ms from the origin of the track`,
        ].join(' | ')
      ),
      checked: checked.length,
      cycles: cycleTimesMs.length,
      gaps: gaps.length,
      hasNoDuration,
    };
  });
}

/**
 * Prints the `READ-UNCHECKED` rows and the `TIMELINE` row of each target of
 * `tracks`. The existence gate: each target has a checked read. A target whose
 * declared timelines have no duration has no checked time: its row says "not
 * tested".
 */
export function expectTimelineRows(
  name: string,
  tracks: PlayedTrack[],
  planned: PlannedRead[],
  reads: NativeRead[]
) {
  const rows = describeTimelineRows(name, tracks, planned, reads);
  for (const { timeline, unchecked, checked, hasNoDuration } of rows) {
    for (const row of [...unchecked, timeline]) {
      console.log(row);
    }
    expect(checked > 0 || hasNoDuration ? '' : timeline).toBe('');
  }
  return rows;
}

function describeModelWaits({ modelWaits, tracks }: Played) {
  return modelWaits.map(({ box, tag, target, reads }) => {
    const [first, written] = [reads[0], reads[reads.length - 1]];
    const track = tracks
      .filter(
        (each) =>
          each.target === target && each.played.from <= written.monotonicTimeMs
      )
      .pop();
    const fromMs = track ? middleOf(track.origin) : first.monotonicTimeMs;
    const clock = track
      ? `after the origin of the native track of the command ${track.generation}`
      : 'after the first read of the wait';
    return `${target} of ${box ? `the ${box} box` : `the view ${tag}`}: read ${reads.length} of the wait has the written model ${written.model.join()} at ${(written.monotonicTimeMs - fromMs).toFixed(3)} ms ${clock}, and its first read has the model ${first.model.join()} at ${(first.monotonicTimeMs - fromMs).toFixed(3)} ms`;
  });
}

export type WriteOrder =
  | { name: 'before the mount' }
  | {
      name: 'after the mount';
      /** The count of the reads before the first read with the written value. */
      reads: number;
      /** The time of the last of them, from the origin of its track. */
      toMs: number;
      /** The time of the first read with the written value, when one has it. */
      writtenAtMs?: number;
    };

/**
 * The order of a write and of the mount of a track, from the reads of the
 * native box from the mount: the reads before the first one that `isWritten`
 * came before the write. It cannot see a write before the first read.
 */
export function writeOrderOf(
  reads: RowRead[],
  isWritten: (read: RowRead) => boolean
): WriteOrder {
  const fromOriginOf = ({ timeMs, tracks: [{ origin }] }: RowRead) =>
    timeMs - middleOf(origin);
  const firstWritten = reads.findIndex(isWritten);
  const before = reads.slice(0, firstWritten < 0 ? reads.length : firstWritten);
  return before.length === 0
    ? { name: 'before the mount' }
    : {
        name: 'after the mount',
        reads: before.length,
        toMs: fromOriginOf(before[before.length - 1]),
        writtenAtMs:
          firstWritten < 0 ? undefined : fromOriginOf(reads[firstWritten]),
      };
}

export const describeWriteOrder = (order: WriteOrder) =>
  order.name === 'before the mount'
    ? order.name
    : `${order.name}, ${order.reads} reads, to ${order.toMs.toFixed(2)} ms, ${order.writtenAtMs === undefined ? 'no read with the written value' : `the first read with the written value at ${order.writtenAtMs.toFixed(2)} ms`}`;

/**
 * For a track that goes from its start value to its end value in a step: each
 * sample of its target before `untilMs` of the sample clock whose read can show
 * one declared value only shows exactly the value that the layout gave to that
 * side (`laidOut.from` for the start value, `laidOut.to` for the end value),
 * and the native box has such a sample of each side.
 */
export function expectSteadySides(
  { rows }: Played,
  track: PlayedTrack,
  untilMs: number,
  laidOut: Band
) {
  const sides = [
    { declared: track.timeline.from, laidOut: laidOut.from },
    { declared: declaredEndOf(track.timeline), laidOut: laidOut.to },
  ];
  const steady = rows
    .map(({ row }) => row.native[track.target])
    .filter(
      ({ monotonicTimeMs }) =>
        monotonicTimeMs >= track.played.from && monotonicTimeMs < untilMs
    )
    .flatMap(({ presentation: [shown], monotonicTimeMs }) => {
      const { from, to } = declaredBandOf(track, monotonicTimeMs);
      const side = sides.find(({ declared }) => declared === from);
      return from === to && side
        ? [{ shown, side, readMs: monotonicTimeMs }]
        : [];
    });
  for (const side of sides) {
    expect(steady.some((read) => read.side === side)).toBe(true);
  }
  expect(
    steady
      .filter(({ shown, side }) => shown !== side.laidOut)
      .map(
        ({ shown, side, readMs }) =>
          `${shown} at ${readMs - middleOf(track.origin)} ms after the origin of the track, laid out ${side.laidOut}, declared ${side.declared}`
      )
      .join(', ')
  ).toBe('');
}

/**
 * Each read of the `Transform` target has the one playback key of its tracks,
 * from their start in the trace to one display frame before their declared
 * end.
 */
export function expectOneKeyWhilePlaying(reads: RowRead[]) {
  const keysOf = new Map<number, Set<string>>();
  for (const { target, tracks, timeMs, sampled } of reads) {
    const [{ origin, generation }] = tracks;
    const declaredEndMs =
      middleOf(origin) +
      Math.max(...tracks.map(({ timeline }) => declaredDurationOf(timeline)));
    if (target === 'Transform' && timeMs < declaredEndMs - FRAME_MS) {
      expect(sampled.playbacks.length).toBe(1);
      keysOf.set(
        generation,
        (keysOf.get(generation) ?? new Set()).add(
          playbackIdOf(sampled.playbacks[0])
        )
      );
    }
  }
  for (const keys of keysOf.values()) {
    expect(keys.size).toBe(1);
  }
}

/**
 * After the frame driver took the box, no row of the target has a playback key:
 * from one display frame after the end report of its first track.
 */
export function expectNoKeyAfterTransfer(
  { rows, tracks }: Played,
  target: ModelTarget = 'Transform'
) {
  const taken = tracks.find((track) => track.target === target);
  if (!taken) {
    throw new Error(`The case has no track of the ${target} target.`);
  }
  const takenMs = taken.played.to + FRAME_MS;
  for (const { row } of rows) {
    const { monotonicTimeMs, playbacks } = row.native[target];
    if (monotonicTimeMs >= takenMs) {
      expect(playbacks.length).toBe(0);
    }
  }
}

export type RowRead = NativeRead & {
  spacingMs?: number;
  /** The sample of the read. */
  sampled: TargetSample;
  /** The sample of the target directly before the read. */
  sampledBefore?: TargetSample;
};

/** Statement A for each row of the native box, with the samples of each read. */
export function expectNativeRows(
  { rows, tracks }: Pick<Played, 'rows' | 'tracks'>,
  matrixTolerance: MatrixTolerance
): RowRead[] {
  const readRows = expectNativeReadRows(
    rows.map(({ row }) => row.native),
    tracks,
    matrixTolerance
  );
  return rows.flatMap(({ row, spacingMs }, index) =>
    readRows[index].map((read) => ({
      ...read,
      spacingMs,
      sampled: row.native[read.target],
      sampledBefore: rows[index - 1]?.row.native[read.target],
    }))
  );
}

const isOffBand = ({ isChecked, residual }: RowRead) =>
  isChecked && !residual.isOnTimeline;

const repeatsAfterGap = (read: RowRead) =>
  isOffBand(read) && read.afterGap?.isRepeated === true;

const describeRead = ({ target, tracks: [track], timeMs }: RowRead) =>
  `${target} of the command ${track.generation}: ${(timeMs - middleOf(track.origin)).toFixed(2)} ms after its origin`;

const describeReadsAfterGap = (reads: RowRead[]) =>
  reads.filter(isOffBand).flatMap((read) => {
    const { afterGap, checked, timeMs, sampled } = read;
    return afterGap
      ? [
          [
            describeRead(read),
            `${afterGap.gapMs.toFixed(2)} ms after the read before`,
            `presentation ${sampled.presentation.join()}`,
            `presentation of the read before ${afterGap.before.join()}`,
            `declared ${checked.map((track) => declaredOf(track, timeMs)).join()}`,
            `band ${checked.map((track) => Object.values(declaredBandOf(track, timeMs)).join('..')).join()}`,
            afterGap.isRepeated ? 'equal' : 'NOT equal',
          ].join(', '),
        ]
      : [];
  });

/** Each checked read that is on the timeline only by `REMOVAL_LEAD_MS`. */
const describeRemovalWindowReads = (reads: RowRead[]) =>
  reads.flatMap((read) => {
    const { isChecked, residual, checked, timeMs, values } = read;
    const { removalEndMs: endMs } = residual;
    const [{ origin }] = checked;
    return isChecked && endMs !== undefined
      ? [
          [
            describeRead(read),
            `declared end ${(endMs - middleOf(origin)).toFixed(3)} ms after its origin`,
            `lead ${(endMs - timeMs).toFixed(3)} ms`,
            `values ${values.join()}`,
            `declared before the end and at the end ${checked.map((track) => declaredSidesOf(track, endMs).join('..')).join()}`,
          ].join(', '),
        ]
      : [];
  });

/** Each checked read that is on the timeline only by its replaced tracks. */
const describeReplacedShownReads = (reads: RowRead[]) =>
  reads
    .filter(({ isChecked, residual }) => isChecked && residual.showsReplaced)
    .map((read) => {
      const {
        tracks: [track],
        timeMs,
        values,
        residual,
      } = read;
      return [
        describeRead(read),
        `the replaced command ${track.replaced?.generation}`,
        `${(timeMs - track.played.from).toFixed(2)} ms after the start of its track`,
        `values ${values.join()}`,
        `on the timeline of the replaced command ${(timeMs - residual.ageMs - track.played.from).toFixed(3)} ms after that start`,
      ].join(', ');
    });

/**
 * Each checked read that is on the timeline only by `KEYFRAME_EDGE_HOLD`, with
 * the edge hold of each of its keys at the time at which it is on the timeline:
 * the segment, its two key times, and its eased progress.
 */
const describeEdgeHoldReads = (reads: RowRead[]) =>
  reads.flatMap((read) => {
    const { isChecked, residual, checked, timeMs, values, edgeHolds } = read;
    const { edgeHoldMs: heldMs } = residual;
    return isChecked && heldMs !== undefined
      ? [
          [
            describeRead(read),
            `on the timeline ${(timeMs - heldMs).toFixed(3)} ms before the read`,
            ...edgeHolds.map(
              ({
                track,
                fromOriginMs,
                segment,
                keysMs,
                easedProgress,
                side,
                value,
              }) =>
                `${describeLeaf(track)} of the command ${track.generation} at ${fromOriginMs.toFixed(3)} ms after its origin: segment ${segment} from the key at ${keysMs.from.toFixed(3)} ms to the key at ${keysMs.to.toFixed(3)} ms, eased progress of the segment ${easedProgress.toFixed(6)}, ${side} side, held value ${value}, declared value ${track.declared(fromOriginMs)}`
            ),
            `values ${values.join()}`,
            `declared ${checked.map((track) => declaredOf(track, heldMs)).join()}`,
          ].join(', '),
        ]
      : [];
  });

/**
 * Each checked read that is off the timeline, with the state of its view: the
 * record of a failed statement A.
 */
function describeReadsOffTimeline(reads: RowRead[], played: Played) {
  const { frameChecks, clockOffset } = played;
  const frameDriverStarts = frameChecks
    .filter(({ record }) => record.box === 'native')
    .flatMap(({ record }) => (record.start ? [record.start.timeMs] : []));
  return reads
    .filter((read) => isOffBand(read) && !repeatsAfterGap(read))
    .map((read) => {
      const {
        tracks: [track],
        timeMs,
        sampled: { presentation, model, playbacks },
      } = read;
      return [
        describeRead(read),
        `${(timeMs - track.played.from).toFixed(2)} ms after the start of its track`,
        `${(track.played.to - timeMs).toFixed(2)} ms before the end report of its track`,
        `presentation ${presentation.join()}`,
        `model ${model.join()}`,
        `playbacks ${playbackIdsOf({ playbacks }).join(', ')}`,
        `start calls of the frame driver for the box, ms after the read: ${frameDriverStarts.map((startMs) => (startMs + middleOf(clockOffset) - timeMs).toFixed(2)).join()}`,
        describeReadBefore(read),
        describeNearestInGap(read),
      ].join(', ');
    });
}

function describeReadBefore(read: RowRead) {
  const { sampled, sampledBefore } = read;
  return sampledBefore
    ? `${sampled.monotonicTimeMs - sampledBefore.monotonicTimeMs} ms after the read before, presentation of the read before ${sampledBefore.presentation.join()}, ${repeatsReadBefore(read) ? 'equal' : 'NOT equal'}`
    : 'no read before';
}

const repeatsReadBefore = ({ sampled, sampledBefore }: RowRead) =>
  sampledBefore !== undefined &&
  sampled.presentation.every(
    (value, cell) => value === sampledBefore.presentation[cell]
  );

function describeNearestInGap({ values, timeMs, checked }: RowRead) {
  const { ageMs, distances } = residualInBandOf(
    values,
    timeMs,
    checked,
    READ_GAP_MS
  );
  return `nearest declared values of the ${READ_GAP_MS} ms before the read: ${ageMs.toFixed(2)} ms before the read, distances ${distances.join()}`;
}

function describeNativeReads(reads: RowRead[], { clockOffset }: Played) {
  const checked = reads.filter(({ isChecked }) => isChecked);
  const repeated = checked.filter(repeatsAfterGap);
  const onBand = checked.filter((read) => !repeated.includes(read));
  const distances = onBand.flatMap(({ residual, checked: tracks }) =>
    residual.distances.map(
      (distance, track) => distance / tracks[track].tolerance
    )
  );
  return [
    `native reads ${checked.length}`,
    `largest distance from the band ${largestOf(distances).toFixed(3)} of the tolerance`,
    `largest age ${largestOf(
      onBand
        .filter(
          ({ residual }) =>
            residual.isOnTimeline && residual.removalEndMs === undefined
        )
        .map(({ residual }) => residual.fitAgeMs)
    ).toFixed(2)} ms`,
    `clock offset band ${(clockOffset.to - clockOffset.from).toFixed(3)} ms`,
    describeNewValueReads(onBand),
    `reads after a gap ${checked.filter(({ afterGap }) => afterGap).length}, ${repeated.length} of them off the band and equal to the read before`,
    `reads in a removal window only ${checked.filter(({ residual }) => residual.removalEndMs !== undefined).length}`,
    `reads at an edge hold only ${checked.filter(({ residual }) => residual.edgeHoldMs !== undefined).length}`,
    `reads of a layer with no animation of the target ${checked.filter(({ sampled }) => layerOf(sampled) === 'rest').length}`,
    describeLongestEqualRun(checked),
  ];
}

/**
 * The longest time over which the checked reads of one target that follow one
 * another showed one value while the declared values changed from each read to
 * the next.
 */
function describeLongestEqualRun(reads: RowRead[]) {
  const declaredAt = ({ checked }: RowRead, timeMs: number) =>
    checked.map((track) => declaredOf(track, timeMs)).join();
  const continuesRun = (read: RowRead, last?: RowRead) =>
    last !== undefined &&
    last.sampled === read.sampledBefore &&
    repeatsReadBefore(read) &&
    declaredAt(read, last.timeMs) !== declaredAt(read, read.timeMs);
  const spanOf = (run?: EqualRun) =>
    run ? run.last.timeMs - run.first.timeMs : 0;
  let longest: EqualRun | undefined;
  for (const target of new Set(reads.map((read) => read.target))) {
    let run: EqualRun | undefined;
    for (const read of reads.filter((ofTarget) => ofTarget.target === target)) {
      run =
        run && continuesRun(read, run.last)
          ? { first: run.first, last: read, count: run.count + 1 }
          : { first: read, last: read, count: 1 };
      if (spanOf(run) > spanOf(longest)) {
        longest = run;
      }
    }
  }
  return [
    `longest equal run on changing declared values ${longest?.count ?? 0} reads over ${spanOf(longest).toFixed(2)} ms`,
    ...(longest
      ? [
          `from ${describeRead(longest.first)}, presentation ${longest.first.sampled.presentation.join()}, declared at its first read ${declaredAt(longest.first, longest.first.timeMs)} and at its last read ${declaredAt(longest.last, longest.last.timeMs)}`,
        ]
      : []),
  ].join(' ');
}

type EqualRun = { first: RowRead; last: RowRead; count: number };

/**
 * The reads that show a value for the first time have the value of their own
 * time: their distance from the declared value of that time, with no band.
 */
function describeNewValueReads(reads: RowRead[]) {
  const fresh = reads.filter(({ spacingMs }) => spacingMs !== undefined);
  const distances = fresh.flatMap(({ checked, values, timeMs }) =>
    checked.map(
      (track, index) =>
        Math.abs(values[index] - declaredOf(track, timeMs)) / track.tolerance
    )
  );
  return `reads of a new value ${fresh.length}, largest spacing ${largestOf(fresh.map(({ spacingMs }) => spacingMs!)).toFixed(2)} ms, largest distance from the value of their time ${largestOf(distances).toFixed(3)} of the tolerance`;
}

/**
 * For each start of tracks with a gate: when the reads of its target came on
 * the timeline, from the start of the tracks in the trace.
 */
function describeGates(reads: RowRead[]) {
  const gated = reads.filter(({ tracks }) =>
    tracks.some(({ checkedFromMs }) => checkedFromMs > -Infinity)
  );
  const startOf = ({ target, tracks: [{ generation }] }: RowRead) =>
    `${target} of the command ${generation}`;
  return [...new Set(gated.map(startOf))].map((start) => {
    const afterStart = gated
      .filter((read) => startOf(read) === start)
      .map(({ tracks: [track], timeMs, residual, isChecked }) => ({
        ms: timeMs - track.played.from,
        isOnTimeline: residual.isOnTimeline,
        isChecked,
      }));
    const off = afterStart.filter(({ isOnTimeline }) => !isOnTimeline);
    const firstOn = afterStart.find(({ isOnTimeline }) => isOnTimeline);
    return [
      `${start}: reads in the gate ${afterStart.filter(({ isChecked }) => !isChecked).length}`,
      `reads off the timeline ${off.length}`,
      `latest read off the timeline ${off.length === 0 ? 'none' : `${largestOf(off.map(({ ms }) => ms)).toFixed(2)} ms`}`,
      `first read on the timeline ${firstOn ? `${firstOn.ms.toFixed(2)} ms` : 'none'}`,
      `first read ${afterStart[0].ms.toFixed(2)} ms`,
    ].join(', ');
  });
}

/**
 * Each read whose display frame has the start of a track that replaced a track:
 * the time and the track of the declared values that are nearest to it.
 */
const describeReplacementReads = (reads: RowRead[]) =>
  reads
    .filter(({ residual }) => residual.crossesReplacement)
    .map(({ target, tracks: [track], timeMs, values, residual }) => {
      const foundMs = timeMs - residual.ageMs;
      const owner =
        residual.showsReplaced && track.replaced
          ? track.replaced
          : ownerAt(track, foundMs);
      return [
        `${target} of the command ${track.generation} that replaced the command ${track.replaced?.generation}: read ${(timeMs - track.played.from).toFixed(2)} ms after the start of its track and ${(timeMs - middleOf(track.origin)).toFixed(2)} ms after its origin`,
        `values ${values.map((value) => value.toFixed(4)).join()}`,
        `nearest declared values: the command ${owner.generation} at ${(foundMs - track.played.from).toFixed(2)} ms after that start, ${residual.ageMs.toFixed(2)} ms before the read`,
        `distances ${residual.distances.map((distance) => distance.toFixed(4)).join()}`,
        residual.isOnTimeline ? 'on the timeline' : 'on NEITHER track',
      ].join(', ');
    });

/**
 * For each captured value: the value, the origin of its build from the origin
 * of its track, and the steady-clock distance from that origin to the trace
 * event of the capture.
 */
const describeCaptures = (captures: Capture[]) =>
  captures.map((capture) => {
    const { track, value, timeMs, eventTimeMs } = capture;
    const {
      distances: [distance],
      ageMs,
    } = capturedResidualOf(capture);
    return `${track.key} of the command ${track.generation}: a build took ${value.toFixed(4)} at its origin, ${(timeMs - middleOf(track.origin)).toFixed(3)} ms after the origin of the track, ${distance.toFixed(4)} from the track at ${ageMs.toFixed(2)} ms before the origin of the build, and the trace event of the capture is ${(eventTimeMs - timeMs).toFixed(3)} ms after the origin of the build on the steady clock`;
  });

// The frame driver and the timeline have the value of one function of one time.
export const FRAME_TOLERANCE = 1e-6;

/**
 * Statement B, for the twin and for the frames that the frame driver gave to
 * the native box. A timing that adopts a start has the start time and the start
 * value of the timing that it replaced. A leaf that starts on screen after a
 * leaf starts at the value of `startFrameOf`.
 */
export function expectFrameRecords({
  frameChecks,
  tracks,
}: Pick<Played, 'frameChecks' | 'tracks'>) {
  const residuals = new Map<LeafCheck, FrameResidual>();
  for (const check of frameChecks) {
    const { record, declared, replaced } = check;
    if (record.adoptedStart && replaced) {
      expect(amountOf(record.adoptedStart.value).amount).toBe(
        replaced.timeline.from
      );
      expect(record.adoptedStart.timeMs).toBe(residuals.get(replaced)?.startMs);
    } else if (replaced && declared.startsOnScreen) {
      expect(
        describeStartOffItsFrame(check, replaced, frameChecks, tracks)
      ).toBe('');
    }
    residuals.set(check, expectFrameTimeline(check, FRAME_TOLERANCE));
  }
  return residuals;
}

function describeFrameRecords(residuals: Map<LeafCheck, FrameResidual>) {
  const frameChecks = [...residuals.keys()];
  const all = [...residuals.values()];
  return [
    `frames ${frameChecks.map(({ record }) => `${record.box} ${describeLeaf(record)} ${record.frames.length}`).join()}`,
    `largest frame distance ${largestOf(all.map(({ distance }) => distance)).toExponential(1)}`,
    `latest computed phase start ${largestOf(all.flatMap(({ startsLateMs }) => startsLateMs)).toFixed(2)} ms after its declared start`,
  ];
}

/**
 * The frame of a replaced record that has the start value of the record that
 * replaced it on screen. The builder gets the values of its view from the
 * layout animations proxy (`materializeLayoutAnimation`), `startStyle` of the
 * layout animations manager makes them the value of the view, and `valueSetter`
 * and `onStart` of `withTiming` start the leaf at that value. The value that a
 * frame of the frame driver wrote comes to the proxy after the callbacks of its
 * UI frame, and a start call in a UI frame has the time of that UI frame. So
 * for a replaced record that the frame driver played, it is the last frame at
 * the start call that does not have the time of the start call. For a replaced
 * record of a native track, it is the last frame at the start call: the frame
 * that the route gave to the record at the origin of the build.
 */
function startFrameOf(
  { record }: LeafCheck,
  replaced: LeafCheck,
  tracks: PlayedTrack[]
) {
  const frames = replaced.record.frames.slice(
    0,
    record.start?.replacedFrames ?? 0
  );
  const playedNatively =
    record.box === 'native' &&
    tracks.some(({ declaration }) => declaration === replaced.declared);
  return lastOf(
    playedNatively
      ? frames
      : frames.filter(({ timeMs }) => timeMs !== record.start?.timeMs)
  );
}

/** Nothing when the start value of a record is the value of `startFrameOf`. */
function describeStartOffItsFrame(
  check: LeafCheck,
  replaced: LeafCheck,
  frameChecks: LeafCheck[],
  tracks: PlayedTrack[]
) {
  const { record } = check;
  const frame = startFrameOf(check, replaced, tracks);
  if (record.start !== undefined && record.start.value === frame?.value) {
    return '';
  }
  const index = frameChecks
    .filter(
      (each) =>
        each.record.box === record.box && isSameLeaf(each.record, record)
    )
    .indexOf(check);
  const last = replaced.record.frames[(record.start?.replacedFrames ?? 0) - 1];
  return `The record ${index} of ${describeLeaf(record)} of the box ${record.box} starts at ${record.start?.value} with a start call at ${record.start?.timeMs.toFixed(3)} ms, and the frame of the replaced record for its start value wrote ${frame?.value} at ${frame?.timeMs.toFixed(3)} ms. The last frame of the replaced record at the start call wrote ${last?.value} at ${last?.timeMs.toFixed(3)} ms.`;
}

export const MODEL_TOLERANCE: MatrixTolerance = {
  cells: 0.0001,
  translation: 0.01,
};

const MODEL_ROWS_IN_FULL = 10;

/**
 * The places of the frames of statement M from the last frame at or before a
 * read: that frame, the frame before it, and the first frame after the read.
 */
const MODEL_LAGS = [0, 1, -1];

/** A read of the model of the native box while the frame driver has it. */
type ModelRead = {
  timeMs: number;
  model: number[];
  /** The count of the frames at or before the read. */
  framesBefore: number;
  /** The one of `MODEL_LAGS` whose frame has the matrix of the model. */
  lag?: number;
};

type ModelFrames = { frames: FrameMatrix[]; mountedMs: number };

/**
 * Statement M, for a native box whose track of `target` the frame driver took:
 * the model of each read, from the mount of the first frame update to the last
 * frame, is the matrix of the last recorded frame at or before the read, of the
 * frame before it, or of the first frame after the read whose recorded time is
 * at most `FRAME_MS` and the clock uncertainty after the read. The matrix of an
 * `Opacity` frame is its one value. The statement needs a recorded frame and a
 * read.
 */
export function expectModelOnFrames(
  caseName: string,
  played: Played,
  target: ModelTarget = 'Transform'
) {
  const record = modelFramesOf(played, target);
  const { frames, mountedMs } = record;
  const reads = modelReadsOf(played, record, target);
  if (reads.length === 0) {
    throw new Error(
      `Statement M of ${caseName} has no read of the ${target} model from the mount of the first frame update to the last of the ${frames.length} frames.`
    );
  }
  const agesOf = (lags: number[]) =>
    sortedOf(
      reads.flatMap(({ timeMs, framesBefore, lag }) =>
        lag !== undefined && lags.includes(lag)
          ? [timeMs - frames[framesBefore - 1 - lag].timeMs]
          : []
      )
    );
  const [last, before, after] = MODEL_LAGS.map((lag) => agesOf([lag]));
  const ages = agesOf([0, 1]);
  const failed = reads.filter(({ lag }) => lag === undefined);
  const spacings = sortedOf(
    frames.slice(1).map(({ timeMs }, index) => timeMs - frames[index].timeMs)
  );
  console.log(
    [
      'MODEL',
      caseName,
      `reads ${reads.length} of the ${target} model from the mount of the first frame update to the last frame`,
      `the model is the matrix of the last frame at or before the read in ${last.length} reads, of the frame before it in ${before.length}, of the first frame after the read in ${after.length}, of none of the three in ${failed.length}`,
      `age against a frame at or before the read: ${describeSpread(ages)} ms`,
      `reads of such an age over ${(2 * FRAME_MS).toFixed(2)} ms ${ages.filter((age) => age > 2 * FRAME_MS).length}`,
      `time from the read to the frame after it: ${describeSpread(after.map((age) => -age).reverse())} ms`,
      `frames ${frames.length}, spacing ${describeSpread(spacings)} ms`,
      `the first frame update is mounted ${(mountedMs - (lastOf(frames.filter(({ timeMs }) => timeMs <= mountedMs))?.timeMs ?? NaN)).toFixed(3)} ms after the frame before it`,
    ].join(' | ')
  );
  for (const read of failed.slice(0, MODEL_ROWS_IN_FULL)) {
    console.log(
      ['MODEL-READ', caseName, describeModelRead(read, record)].join(' | ')
    );
  }
  expect(failed.length).toBe(0);
}

const sortedOf = (values: number[]) =>
  [...values].sort((first, second) => first - second);

const describeSpread = (sorted: number[]) =>
  sorted.length === 0
    ? 'no value'
    : `smallest ${sorted[0].toFixed(3)}, median ${sorted[Math.floor(sorted.length / 2)].toFixed(3)}, largest ${sorted[sorted.length - 1].toFixed(3)}`;

/**
 * The matrix of each frame of the frame driver on `target` of the native box,
 * on the sample clock, and the mount of the first frame update of its track.
 */
function modelFramesOf(
  { events, frameRecords, clockOffset }: Played,
  target: ModelTarget
): ModelFrames {
  const mounted = events.find(
    (event) => event.event === 'FrameUpdateMounted' && event.target === target
  );
  if (!mounted) {
    throw new Error(
      `The trace has no first frame update of the ${target} target: ${summarize(events)}`
    );
  }
  const frames = frameCellsOf(
    frameRecords.filter(({ box }) => box === 'native'),
    target
  ).map(({ timeMs, cells }) => ({
    timeMs: timeMs + middleOf(clockOffset),
    cells,
  }));
  if (frames.length === 0) {
    throw new Error(
      `The frame driver recorded no frame of the ${target} target of the native box.`
    );
  }
  return { frames, mountedMs: mounted.monotonicTimeMs };
}

const frameCellsOf = (
  records: FrameRecord[],
  target: ModelTarget
): FrameMatrix[] =>
  target === 'Transform'
    ? frameMatricesOf(records.filter(isOperationRecord))
    : records
        .filter(({ key }) => READERS[key]?.target === target)
        .flatMap(({ frames }) =>
          frames.map(({ timeMs, value }) => ({
            timeMs,
            cells: [amountOf(value).amount],
          }))
        );

/** The reads of the model from `mountedMs` to the last frame. */
function modelReadsOf(
  { rows, clockOffset }: Played,
  { frames, mountedMs }: ModelFrames,
  target: ModelTarget
): ModelRead[] {
  const uncertaintyMs = uncertaintyOf(clockOffset);
  const lastMs = frames[frames.length - 1].timeMs;
  let framesBefore = 0;
  return rows
    .map(({ row }) => row.native[target])
    .filter(
      ({ monotonicTimeMs }) =>
        monotonicTimeMs >= mountedMs && monotonicTimeMs <= lastMs
    )
    .map(({ monotonicTimeMs: timeMs, model }) => {
      while (
        framesBefore < frames.length &&
        frames[framesBefore].timeMs - uncertaintyMs <= timeMs
      ) {
        framesBefore += 1;
      }
      const lag = MODEL_LAGS.find((each) => {
        const index = framesBefore - 1 - each;
        return (
          index >= 0 &&
          index < frames.length &&
          frames[index].timeMs - timeMs <= FRAME_MS + uncertaintyMs &&
          isSameMatrix(model, frames[index].cells)
        );
      });
      return { timeMs, model, framesBefore, lag };
    });
}

const isSameMatrix = (first: number[], second: number[]) =>
  first.every(
    (cell, index) =>
      Math.abs(cell - second[index]) <= cellToleranceOf(index, MODEL_TOLERANCE)
  );

function describeModelRead(
  { timeMs, model, framesBefore }: ModelRead,
  { frames, mountedMs }: ModelFrames
) {
  const describeFrame = (index: number) =>
    index >= 0 && index < frames.length
      ? `the frame ${index}, ${(timeMs - frames[index].timeMs).toFixed(3)} ms before the read, with ${frames[index].cells.join()}`
      : 'none';
  return [
    `${(timeMs - mountedMs).toFixed(3)} ms after the mount of the first frame update`,
    `model ${model.join()}`,
    `last frame at or before the read: ${describeFrame(framesBefore - 1)}`,
    `the frame before it: ${describeFrame(framesBefore - 2)}`,
    `first frame after the read: ${describeFrame(framesBefore)}`,
  ].join(', ');
}

/**
 * Each animation gave its callbacks, and each box that is mounted ends at the
 * end value of each key, with no playback.
 */
function expectEnd(
  referenceCase: ReferenceCase,
  { end, endKeys, missingCallbacks }: Played
) {
  expect(missingCallbacks).toBe('');
  expect([...callbacks].sort().join()).toBe(
    expectedCallbacksOf(referenceCase).sort().join()
  );
  if (!end) {
    return;
  }
  const written = writtenTargetsOf(referenceCase);
  for (const key of endKeys) {
    expect(end.native[key.target].playbacks.length).toBe(0);
    const isWritten = written.some((target) => target === key.target);
    if (key.operation === undefined && !isWritten) {
      const atRest = shownAtRestOf(key, amountOf(key.to).amount);
      for (const [shown] of [
        end.native[key.target].presentation,
        end.frame[key.target].model,
      ]) {
        expect(Math.abs(shown - atRest) <= key.tolerance).toBe(true);
      }
    }
  }
  const operations = endOperationsOf(referenceCase);
  if (operations && !written.includes('Transform')) {
    const cells = endCellsOf(operations);
    for (const shown of [
      end.native.Transform.presentation,
      end.frame.Transform.model,
    ]) {
      const distances = cells.map(
        (cell, index) =>
          Math.abs(shown[index] - cell) /
          cellToleranceOf(index, matrixToleranceOf(referenceCase))
      );
      expect(largestOf(distances) <= 1).toBe(true);
    }
  }
}

/** The targets whose model a restyle or a write takes off the declaration. */
const writtenTargetsOf = ({ restyle, write }: ReferenceCase): ModelTarget[] => [
  ...(restyle?.transform ? (['Transform'] as const) : []),
  ...(write?.targets ?? []),
];

const largestOf = (values: number[]) =>
  values.reduce((largest, value) => Math.max(largest, value), 0);

/** A track that the frame driver took, with its hand-over window. */
export type HandOver = {
  track: ScalarTrack;
  /** The start call of the frame driver for the key on the native box. */
  startCallMs: number;
  /**
   * To the last time at which a read can show the track: the stay of a
   * presentation value and the uncertainty of the origin after its end report.
   */
  window: Band;
};

export function handOversOf(played: Played): HandOver[] {
  const clock = middleOf(played.clockOffset);
  return played.tracks.filter(isScalarTrack).flatMap((track): HandOver[] => {
    if (track.finished !== false || isReplaced(played, track)) {
      return [];
    }
    const [startCallMs] = played.frameChecks.flatMap(({ record }) =>
      record.box === 'native' &&
      isSameLeaf(record, track) &&
      record.start !== undefined &&
      record.start.timeMs + clock >= track.played.from
        ? [record.start.timeMs + clock]
        : []
    );
    return startCallMs === undefined
      ? []
      : [
          {
            track,
            startCallMs,
            window: {
              from: startCallMs,
              to:
                track.played.to +
                PRESENTATION_STAY_MS +
                uncertaintyOf(track.origin),
            },
          },
        ];
  });
}

export const isReplaced = ({ tracks }: Played, track: PlayedTrack) =>
  tracks.some(({ replaced }) => replaced === track);

/**
 * The style transform of the boxes after a commit: a commit that declares no
 * operations keeps the style of the commit before.
 */
function transformOf(referenceCase: ReferenceCase, commit: number) {
  const operations =
    declarationOf(referenceCase, commit).operations ?? referenceCase.operations;
  return operations && endTransformOf(operations);
}

const declarationOf = (
  referenceCase: ReferenceCase,
  commit: number
): Declaration =>
  commit > 0 && referenceCase.replacement
    ? referenceCase.replacement
    : referenceCase;

/** The last operations that a case declares. */
export const endOperationsOf = (referenceCase: ReferenceCase) =>
  declarationOf(referenceCase, referenceCase.places.length - 2).operations;

export const targetsOf = (referenceCase: ReferenceCase) => [
  ...new Set([
    ...[referenceCase, referenceCase.replacement ?? referenceCase].flatMap(
      ({ leaves, operations = [] }) => [
        ...Object.keys(leaves).map((key) => READERS[key].target),
        ...operations.map(() => 'Transform'),
      ]
    ),
    ...(referenceCase.alsoSampled ?? []),
  ]),
];

/** The keyframe animation that has the timings of an opacity leaf as its points. */
function opacityKeyframeOf(leaf: Leaf) {
  const timeline = declaredTimelineOf(leaf, leaf.initial as number, leaf.to!);
  const { from, phases } = timeline;
  const totalMs = declaredDurationOf(timeline);
  const definitions: ConstructorParameters<typeof Keyframe>[0] = {
    0: { opacity: from },
  };
  let endMs = 0;
  for (const { durationMs, move } of phases) {
    endMs += durationMs;
    definitions[(100 * endMs) / totalMs] = {
      opacity: move!.to,
      easing: move!.curve,
    };
  }
  return new Keyframe(definitions).duration(
    totalMs
  ) as unknown as CallbackBuilder;
}

type BoxOptions = Pick<ReferenceCase, 'box'> & {
  animations: Animations;
  place: Place;
  transform: ViewStyle['transform'];
};

function ReferenceScene({
  animations,
  place,
  clips,
  ...box
}: Omit<BoxOptions, 'animations' | 'place'> & {
  animations: Record<BoxName, Animations>;
  place?: Place;
  /** The cells are in a scroll view: `scrollTo(CLIPPED_OFFSET)` clips them. */
  clips: boolean;
}) {
  const clockRef = useTestRef(CLOCK_REF);
  const cells = (Object.keys(BOXES) as BoxName[]).map((name) => (
    <View key={name} collapsable={false} style={styles.pairCell}>
      {place && (
        <ReferenceBox
          refName={BOXES[name]}
          animations={animations[name]}
          place={place}
          {...box}
        />
      )}
    </View>
  ));
  return (
    <View>
      <View ref={clockRef} collapsable={false} />
      {clips ? (
        <ClippingScrollView scrollRef={scrollRef} style={clipStyles.window}>
          <View collapsable={false}>{cells}</View>
          <View style={clipStyles.filler} />
        </ClippingScrollView>
      ) : (
        cells
      )}
    </View>
  );
}

const clipStyles = StyleSheet.create({
  window: { height: 300 },
  filler: { height: 2000 },
});

function ReferenceBox({
  refName,
  animations,
  place,
  transform,
  box: { Box = SizeBox, ...box } = {},
}: BoxOptions & { refName: string }) {
  const { originX, originY, width, height, ...style } = restOf(place);
  return (
    <Box
      refName={refName}
      {...animations}
      {...box}
      left={originX}
      top={originY}
      width={width}
      height={height}
      style={[style, { transform }, box.style]}
    />
  );
}

/** The value of each key of a box at rest in a place. */
const restOf = ({
  left,
  top,
  opacity = 1,
  width = BOX_SIZE,
  height = BOX_SIZE,
  borderRadius = 0,
}: Place): Record<string, number> => ({
  originX: left,
  originY: top,
  opacity,
  width,
  height,
  borderRadius,
});

/**
 * The twin of an animation of `layoutOf` has a callback on each timing, so it
 * has no native form.
 */
function animationsOf(
  referenceCase: ReferenceCase,
  commit: number
): Record<BoxName, Animations> {
  const { flow, builder } = referenceCase;
  const { leaves, operations } = declarationOf(referenceCase, commit);
  const animationOf = flow === 'layout' ? layoutOf : entryExitOf;
  const built = (box: BoxName, isFrameDriven: boolean): AnimationSource => {
    if (builder) {
      const animation = builder().withCallback(callbackOf(box));
      return isFrameDriven ? frameDrivenOf(animation) : animation;
    }
    return animationOf(
      Object.fromEntries(
        Object.entries(leaves).map(([key, leaf]) => [
          key,
          { ...leaf, hasCallback: isFrameDriven || leaf.hasCallback },
        ])
      ),
      {
        name: box,
        transform: operations && {
          operations,
          shared: { hasCallback: isFrameDriven },
        },
      }
    );
  };
  return {
    native: { [flow]: frameRecordedOf('native', built('native', false)) },
    frame: { [flow]: frameRecordedOf('frame', built('frame', true)) },
  };
}

const lastOf = <TItem,>(items: TItem[]): TItem | undefined =>
  items[items.length - 1];

type Tags = Record<BoxName, number>;

const tagsOf = (): Tags => ({
  native: getTestComponent(BOX_REF).getTag(),
  frame: getTestComponent(FRAME_BOX_REF).getTag(),
});

/** The samples of one view in one request step. */
export const sampleTargets = async (
  tag: number,
  targets: string[]
): Promise<Record<string, TargetSample>> =>
  Object.fromEntries(
    await Promise.all(
      targets.map(
        async (target) => [target, await sample(tag, target)] as const
      )
    )
  );

/**
 * The samples of one request step: they are next to each other in the host
 * queue.
 */
async function takeSamples(targets: string[], tags: Tags): Promise<Samples> {
  const [native, frame] = await Promise.all([
    sampleTargets(tags.native, targets),
    sampleTargets(tags.frame, targets),
  ]);
  return { native, frame };
}

type LeafEnds = Pick<DeclaredKey, 'from' | 'to' | 'base'>;

export type BuiltKey = {
  /** With the start value and the end values of the native box. */
  declared: DeclaredKey;
  /** The start value and the end values of the twin. */
  twinEnds: LeafEnds;
  /**
   * The native route starts no track for the key, and its live track goes on:
   * the commit gives the key the end value and the leaf that it has from the
   * commit before. It is the kit's form of the relation `continues` of
   * `relateToLiveLeaf` of the package: a timing with the end value and the form
   * of the live timing. `tracksOf` checks it against the tracks that each
   * command started.
   */
  continuesTrack: boolean;
};

/**
 * The keys that the builders of each commit of a case make, then the keys of
 * the build that gives the box to the frame driver. `mounted` has the laid-out
 * values of the fractional numbers of the places.
 */
export function buildsOf(
  referenceCase: ReferenceCase,
  mounted: MountedValue[] = []
): BuiltKey[][] {
  const { places, restyle, clip } = referenceCase;
  const rests = {
    native: restsOf(places, mounted, 'native'),
    frame: restsOf(places, mounted, 'frame'),
  };
  const builtKeys: BuiltKey[][] = [];
  places.slice(1).forEach((_, commit) => {
    builtKeys.push(
      builtKeysOf(referenceCase, commit, builtKeys[commit - 1] ?? [], rests)
    );
  });
  if (restyle?.handsOver || clip) {
    builtKeys.push(
      lastOf(builtKeys)!.map((key) => ({ ...key, continuesTrack: true }))
    );
  }
  return builtKeys;
}

/**
 * What a commit declares for each key whose leaf its builder makes. A spring
 * and an operation with a matrix value have no timeline. A key of
 * `earlierKeys`, the keys of the commit before, is in flight: it is not at its
 * target value, so its builder makes its leaf. `rests` is `restsOf` each box: a
 * layout key of a box starts and ends at the laid-out values of that box.
 */
function builtKeysOf(
  referenceCase: ReferenceCase,
  commit: number,
  earlierKeys: BuiltKey[],
  rests: Record<BoxName, (Record<string, number> | undefined)[]>
): BuiltKey[] {
  const { flow } = referenceCase;
  const { leaves, operations = [] } = declarationOf(referenceCase, commit);
  const earlier: Partial<Declaration> =
    commit > 0 ? declarationOf(referenceCase, commit - 1) : {};
  const earlierLeaves: Record<string, Leaf> = earlier.leaves ?? {};
  const inFlight = earlierKeys.map(({ declared }) => declared.key);
  const restsOfCommit = (box: BoxName) => {
    const [before, after] = [rests[box][commit], rests[box][commit + 1]];
    return { before, rest: (after ?? before)! };
  };
  const { before, rest } = restsOfCommit('native');
  return [
    ...Object.entries(leaves).flatMap(([key, leaf]): BuiltKey[] => {
      const isChanged = flow !== 'layout' || before![key] !== rest[key];
      const isAtTarget = !isChanged && !inFlight.includes(key);
      if (leaf.isSpring || (leaf.onlyWhenChanged && isAtTarget)) {
        return [];
      }
      const initial = leaf.initial as number | undefined;
      const endsOf = (box: BoxName): LeafEnds => {
        const ofBox = restsOfCommit(box);
        return isLayoutKey(key)
          ? {
              from: (ofBox.before ?? ofBox.rest)[key] + (initial ?? 0),
              to: ofBox.rest[key] + (leaf.to ?? 0),
              base: ofBox.rest[key],
            }
          : { from: initial!, to: leaf.to! };
      };
      const ends = endsOf('native');
      const { sizeKey, ...reader } = READERS[key];
      // A position sample is the center of the box: with a new size and no size track, it starts at a
      // center that the view did not show.
      const startsWithSizeOnScreen =
        !sizeKey || sizeKey in leaves || before?.[sizeKey] === rest[sizeKey];
      return [
        {
          declared: {
            ...reader,
            key,
            leaf,
            ...ends,
            startsOnScreen:
              ends.from === before?.[key] && startsWithSizeOnScreen,
            size: sizeKey ? { key: sizeKey, rest: rest[sizeKey] } : undefined,
          },
          twinEnds: endsOf('frame'),
          continuesTrack: !isChanged && leaf === earlierLeaves[key],
        },
      ];
    }),
    ...operations.flatMap(([kind, from, to, leaf = {}], index): BuiltKey[] => {
      if (typeof from === 'object' || typeof to === 'object' || leaf.isSpring) {
        return [];
      }
      const ends = { from: leaf.isPlain ? to : from, to };
      return [
        {
          declared: {
            key: kind,
            operation: index,
            target: 'Transform',
            leaf: leaf.isPlain ? PLAIN_VALUE : leaf,
            isPlain: leaf.isPlain,
            ...ends,
            startsOnScreen: false,
          },
          twinEnds: ends,
          continuesTrack: operations === earlier.operations,
        },
      ];
    }),
  ];
}

/** A plain value of an operation shows from the start, with no animation. */
const PLAIN_VALUE: Leaf = { duration: 0 };

/**
 * Each commit that gives a key a new native timeline starts one command, with
 * one track for each target of those keys.
 */
function tracksOf(
  referenceCase: ReferenceCase,
  builtKeys: BuiltKey[][],
  events: TraceEvent[],
  clockOffset: Band,
  rows: TakenRow<Samples>[],
  clippedMs = Infinity
) {
  const commands = events.filter(({ event }) => event === 'Admitted');
  const tracks: PlayedTrack[] = [];
  builtKeys.forEach((keys, commit) => {
    const started = keys
      .filter(({ continuesTrack }) => !continuesTrack)
      .map(({ declared }) => declared);
    if (
      started.length === 0 ||
      declarationOf(referenceCase, commit).isFrameDriven
    ) {
      return;
    }
    const command = commands.shift();
    if (!command) {
      throw new Error(
        `The trace has no command of the commit ${commit}: ${summarize(events)}`
      );
    }
    const startedTargets = events
      .filter(
        (event) => event.event === 'TrackStarted' && isOfCommand(event, command)
      )
      .map(({ target }) => target);
    const declaredTargets = [...new Set(started.map(({ target }) => target))];
    if (startedTargets.sort().join() !== declaredTargets.sort().join()) {
      for (const row of describeTracks(events, clockOffset, rows)) {
        console.log(`TRACKS | commit ${commit} | ${row}`);
      }
      throw new Error(
        `The command of the commit ${commit} started the tracks ${startedTargets.join()}, and the case declares ${declaredTargets.join()}.`
      );
    }
    const played = playedTracksOf(
      events,
      command,
      clockOffset,
      started,
      [...tracks].reverse()
    );
    tracks.push(
      ...writtenTargetsOf(referenceCase)
        .reduce(checkedToRemovalOf, played)
        .map((track) => checkedToClipOf(track, clippedMs))
    );
  });
  if (commands.length > 0) {
    throw new Error(
      `The trace has a command that the case does not declare: ${summarize(events)}`
    );
  }
  return tracks;
}

/**
 * After a restyle or a write of a target, the model of a box is not the end
 * value of its declaration: a read of the target that can show the model is not
 * checked. The platform takes an animation off its layer up to
 * `REMOVAL_LEAD_MS` before its declared end.
 */
export function checkedToRemovalOf(
  tracks: PlayedTrack[],
  target: ModelTarget
): PlayedTrack[] {
  const written = tracks.filter((track) => track.target === target);
  const declaredEndMs = Math.max(
    ...written.map(
      ({ origin, timeline }) => origin.from + declaredDurationOf(timeline)
    )
  );
  return tracks.map((track) =>
    written.includes(track)
      ? { ...track, checkedToMs: declaredEndMs - REMOVAL_LEAD_MS }
      : track
  );
}

/**
 * The platform removes the animations of a clipped box before the end report of
 * a track: no read from the first row after the scroll call is checked.
 */
const checkedToClipOf = (track: PlayedTrack, clippedMs: number): PlayedTrack =>
  clippedMs === Infinity
    ? track
    : {
        ...track,
        checkedToMs: Math.min(track.checkedToMs ?? Infinity, clippedMs),
      };

/**
 * What the native box got: each event of its trace, each physical playback that
 * its samples show (the animations of the target and the platform keys of the
 * view), and the samples on the two sides of the origin of each command.
 */
function describeTracks(
  events: TraceEvent[],
  clockOffset: Band,
  rows: TakenRow<Samples>[]
) {
  const samples = rows.map(({ row }) => row.native);
  const playbacks = new Map<string, { firstMs: number; lastMs: number }>();
  for (const sample of samples) {
    for (const [target, read] of Object.entries(sample)) {
      if (read.members.length === 0) {
        continue;
      }
      const playback = `${target}: animations ${JSON.stringify(read.members)}, playbacks of the view ${playbackIdsOf(read).join(', ')}`;
      playbacks.set(playback, {
        firstMs: playbacks.get(playback)?.firstMs ?? read.monotonicTimeMs,
        lastMs: read.monotonicTimeMs,
      });
    }
  }
  const describeSample = (sample?: Samples['native']) =>
    sample === undefined
      ? 'no sample'
      : Object.entries(sample)
          .map(
            ([target, { model, presentation, monotonicTimeMs }]) =>
              `${target} at ${monotonicTimeMs} ms: model ${model.join()}, presentation ${presentation.join()}`
          )
          .join('; ');
  return [
    `clock offset ${clockOffset.from}..${clockOffset.to} ms (the sample clock is the origin clock plus the offset), samples ${samples.length}`,
    ...events.map((event) => `event ${JSON.stringify(event)}`),
    ...[...playbacks].map(
      ([playback, { firstMs, lastMs }]) =>
        `playback in the samples from ${firstMs} to ${lastMs} ms | ${playback}`
    ),
    ...events
      .filter(({ originTimestampMs }) => originTimestampMs !== undefined)
      .flatMap(({ originTimestampMs, generation }) => {
        const originMs = originTimestampMs! + middleOf(clockOffset);
        const isBefore = (sample: Samples['native']) =>
          Object.values(sample)[0].monotonicTimeMs < originMs;
        return [
          `origin of the command ${generation} at ${originMs} ms of the sample clock | last sample before it | ${describeSample(samples.filter(isBefore).pop())}`,
          `origin of the command ${generation} at ${originMs} ms of the sample clock | first sample from it | ${describeSample(samples.find((sample) => !isBefore(sample)))}`,
        ];
      }),
  ];
}

/**
 * The records of the keys that have a timeline, each with its timeline: record
 * n of a leaf of a box is of declaration n of the leaf, with the start value
 * and the end values of that box. A timing that adopts a start has its own
 * duration and easing from the adopted start value (`onStart` of `withTiming`
 * of the package). A leaf that starts on screen after a leaf starts at the
 * value of its start call.
 */
export function frameChecksOf(builtKeys: BuiltKey[], records: FrameRecord[]) {
  const checks: LeafCheck[] = [];
  for (const record of records) {
    const earlier = checks.filter(
      (check) =>
        check.record.box === record.box && isSameLeaf(check.record, record)
    );
    const built = builtKeys.filter(({ declared }) =>
      isSameLeaf(declared, record)
    )[earlier.length];
    if (!built) {
      continue;
    }
    const { declared, twinEnds } = built;
    const { from, to, base } = record.box === 'frame' ? twinEnds : declared;
    const replaced = lastOf(earlier);
    const startValue =
      record.adoptedStart?.value ??
      (declared.startsOnScreen && replaced ? record.start?.value : undefined) ??
      from;
    checks.push({
      record,
      declared,
      replaced,
      timeline: declaredTimelineOf(declared.leaf, startValue, to, base),
    });
  }
  return checks.filter(({ record }) => record.frames.length > 0);
}
