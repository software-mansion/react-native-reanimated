/*
 * The cases of the native layout suites that have a statement on the wall clock. The suite of a case plays
 * it for statements A and B of `native layout reference`, and the suite `native layout live clock` plays it
 * for the wall-clock statements.
 */
import { Easing } from 'react-native-reanimated';

import type { Place, ReferenceCase } from './nativeLayoutReferencePlay';
import type { Leaf, MatrixTolerance, Operation } from './nativeLayoutTestKit';
import {
  DURATION,
  END_LEFT,
  endTransformOf,
  END_OPACITY,
  PAIR_DURATION,
  PAIR_LEFT,
  PAIR_TOP,
  START_LEFT,
  START_OPACITY,
} from './nativeLayoutTestKit';

export const PAIR_START: Place = { left: START_LEFT, top: 0 };
export const PAIR_END: Place = { left: PAIR_LEFT, top: PAIR_TOP };

/** The X position has the easing, and the Y position is linear. */
export const curveLeavesOf = (easing: Leaf['easing']) => ({
  originX: { duration: PAIR_DURATION, easing },
  originY: { duration: PAIR_DURATION },
});

const curveOf = (easing: Leaf['easing'], hasOpacity = true): ReferenceCase => ({
  flow: 'layout',
  leaves: {
    ...curveLeavesOf(easing),
    ...(hasOpacity && {
      opacity: {
        duration: PAIR_DURATION,
        easing,
        initial: START_OPACITY,
        to: END_OPACITY,
      },
    }),
  },
  places: [
    { ...PAIR_START, opacity: START_OPACITY },
    { ...PAIR_END, opacity: hasOpacity ? END_OPACITY : START_OPACITY },
  ],
  totalMs: PAIR_DURATION,
});

/**
 * The native route fits each curve after the two Bezier curves. The overshoot
 * curve leaves the range from 0 to 1, and the presentation layer shows it.
 */
export const CURVE_CASES: Record<string, ReferenceCase> = {
  'Easing.linear': curveOf(Easing.linear),
  'the default easing': curveOf('default'),
  'Easing.sin': curveOf(Easing.sin),
  'Easing.out(Easing.exp)': curveOf(Easing.out(Easing.exp)),
  'Easing.out(Easing.back(1.7))': curveOf(Easing.out(Easing.back(1.7))),
  'Easing.bounce': curveOf(Easing.bounce),
  'Easing.ease': curveOf(Easing.ease),
  'Easing.bezier(0.25, 0.1, 0.25, 1)': curveOf(
    Easing.bezier(0.25, 0.1, 0.25, 1)
  ),
  'Easing.bezier(0.7, 0, 0.3, 1)': curveOf(
    Easing.bezier(0.7, 0, 0.3, 1),
    false
  ),
};

export const SIZE_DURATION = 2000;
export const SIZE_START: Place = { left: 0, top: 0, width: 50, height: 50 };
export const MOVED_AND_RESIZED: Place = {
  left: 120,
  top: 40,
  width: 150,
  height: 90,
};
export const WIDE: Place = { left: 120, top: 0, width: 150, height: 50 };
export const TALL: Place = { left: 0, top: 40, width: 50, height: 130 };

const sizeOf = (
  leaves: ReferenceCase['leaves'],
  end: Place
): ReferenceCase => ({
  flow: 'layout',
  leaves,
  places: [SIZE_START, end],
  totalMs: SIZE_DURATION,
});

/** A size that holds its start value for a time of the position track. */
export const HELD_SIZE_CASES = {
  'four leaves with different durations, delays, and easings': sizeOf(
    {
      originX: { duration: SIZE_DURATION },
      originY: {
        duration: SIZE_DURATION / 2,
        delays: [SIZE_DURATION / 4],
        easing: Easing.ease,
      },
      width: {
        duration: SIZE_DURATION / 2,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
      height: {
        duration: 0.75 * SIZE_DURATION,
        delays: [SIZE_DURATION / 8],
        easing: Easing.bezier(0.7, 0, 0.3, 1),
      },
    },
    MOVED_AND_RESIZED
  ),
  'a delayed width during a native X': sizeOf(
    {
      originX: { duration: SIZE_DURATION },
      width: { duration: SIZE_DURATION / 2, delays: [SIZE_DURATION / 3] },
    },
    WIDE
  ),
  'a delayed width with no duration during a native X': sizeOf(
    {
      originX: { duration: SIZE_DURATION },
      width: { duration: 0, delays: [SIZE_DURATION / 2] },
    },
    WIDE
  ),
  'a delayed height with no duration during a native Y': sizeOf(
    {
      originY: { duration: SIZE_DURATION },
      height: { duration: 0, delays: [SIZE_DURATION / 2] },
    },
    TALL
  ),
} satisfies Record<string, ReferenceCase>;

const HOLD: Leaf = { duration: 0, delays: [DURATION] };

/** The frame driver takes the box and runs the replaced X through the delay. */
export const HOLD_AFTER_TRACK_CASES: Record<string, ReferenceCase> = {
  'a hold that replaces a playing track': {
    flow: 'layout',
    leaves: { originX: { duration: 4 * DURATION } },
    replacement: { leaves: { originX: HOLD }, isFrameDriven: true },
    places: [
      PAIR_START,
      { ...PAIR_START, left: END_LEFT },
      { ...PAIR_START, left: 2 * END_LEFT },
    ],
    commitTimesMs: [DURATION],
    totalMs: 1.5 * DURATION,
  },
};

export const TRANSFORM_DURATION = 2400;
export const TRANSFORM_TOLERANCE: MatrixTolerance = {
  cells: 0.005,
  translation: 0.005,
};
/** The layout of the boxes changes with no position leaf. */
export const TRANSFORM_PLACES: Place[] = [
  { left: 60, top: 60 },
  { left: 62, top: 60 },
];

/** Each operation has the leaf `shared`, then its own leaf. */
export const timedOperationsOf = (
  operations: Operation[],
  shared: Leaf = {}
): Operation[] =>
  operations.map(([kind, from, to, leaf]) => [
    kind,
    from,
    to,
    { duration: TRANSFORM_DURATION, ...shared, ...leaf },
  ]);

export const transformCaseOf = (
  operations: Operation[],
  shared: Leaf = {},
  options: Partial<ReferenceCase> = {}
): ReferenceCase => ({
  flow: 'layout',
  leaves: {},
  operations: timedOperationsOf(operations, shared),
  places: TRANSFORM_PLACES,
  totalMs: TRANSFORM_DURATION,
  matrixTolerance: TRANSFORM_TOLERANCE,
  ...options,
});

export const ONE_OPERATION_CASES = Object.fromEntries(
  (
    [
      ['translateX', 0, 80],
      ['translateY', -30, 30],
      ['scale', 0.5, 1.5],
      ['scaleX', 0.2, 1],
      ['scaleY', 1, 2],
      ['rotate', '0deg', '90deg'],
      ['rotateZ', 0, 2],
      ['rotateX', 0, 1],
      ['rotateY', '0rad', '1rad'],
    ] satisfies Operation[]
  ).map((operation) => {
    const [kind, from, to] = operation;
    return [`${kind} from ${from} to ${to}`, transformCaseOf([operation])];
  })
);

export const TRANSFORM_CASES = {
  'a rotation of two turns': transformCaseOf([['rotate', '0deg', '720deg']]),
  'a translation after a delay': transformCaseOf(
    [['translateX', 40, 0]],
    { duration: 400, delays: [600] },
    { totalMs: 1000 }
  ),
} satisfies Record<string, ReferenceCase>;

export const TRANSLATION: Operation[] = [['translateX', 0, 80]];
const [TRANSFORM_START, TRANSFORM_END] = TRANSFORM_PLACES;
export const BACK_AT_START = [TRANSFORM_START, TRANSFORM_END, TRANSFORM_START];
export const SECOND_COMMIT_MS = 0.4 * TRANSFORM_DURATION;

/** A second commit comes during the track of the first. */
export const CONTINUITY_CASES = {
  'a new start with another end value': transformCaseOf(
    TRANSLATION,
    {},
    {
      replacement: {
        leaves: {},
        operations: timedOperationsOf([['translateX', 50, 20]]),
      },
      places: BACK_AT_START,
      commitTimesMs: [SECOND_COMMIT_MS],
    }
  ),
  'a new start with the same end value and a position leaf': transformCaseOf(
    TRANSLATION,
    {},
    {
      leaves: { originX: { duration: 400 } },
      places: BACK_AT_START,
      commitTimesMs: [SECOND_COMMIT_MS],
      totalMs: TRANSFORM_DURATION - SECOND_COMMIT_MS,
    }
  ),
} satisfies Record<string, ReferenceCase>;

export const COMMITTED_TRANSLATION: Operation[] = [['translateX', 30, 30]];
export const COMMITTED_ROTATION: Operation[] = [['rotate', '30deg', '30deg']];

/** A commit of the end style of `committed` during the track of a case. */
const styleCommitOf = (
  referenceCase: ReferenceCase,
  committed: Operation[]
): ReferenceCase => ({
  ...referenceCase,
  restyle: { atMs: SECOND_COMMIT_MS, transform: endTransformOf(committed) },
});

export const STYLE_COMMIT_CASES = {
  'a commit of another style transform during a track of a number':
    styleCommitOf(
      ONE_OPERATION_CASES['translateX from 0 to 80'],
      COMMITTED_TRANSLATION
    ),
  'a commit of another style transform during a track of an angle in degrees':
    styleCommitOf(
      ONE_OPERATION_CASES['rotate from 0deg to 90deg'],
      COMMITTED_ROTATION
    ),
} satisfies Record<string, ReferenceCase>;

const OPERATION_TOLERANCE: MatrixTolerance = {
  cells: TRANSFORM_TOLERANCE.cells,
  translation: 0.25,
};

/** Operations of one transform, each with its own timeline. */
export const timelinesOf = (
  operations: Operation[],
  totalMs: number,
  options: Partial<ReferenceCase> = {}
): ReferenceCase =>
  transformCaseOf(
    operations,
    {},
    { totalMs, matrixTolerance: OPERATION_TOLERANCE, ...options }
  );

/** A scale that stays at 1 beside a translation. */
const keptValueOf = (keptMs: number, movingMs: number) =>
  timelinesOf(
    [
      ['scale', 1, 1, { duration: keptMs }],
      ['translateX', 0, 60, { duration: movingMs }],
    ],
    Math.max(keptMs, movingMs)
  );

/**
 * At 800 ms the X translation holds its end value and the Y translation is at
 * 24.
 */
export const HELD_AND_MOVING: Operation[] = [
  ['translateX', 0, 80, { duration: 400 }],
  ['translateY', 0, 60, { duration: 2000 }],
];
export const HELD_AND_MOVING_COMMIT_MS = 800;

export const OPERATION_TIMELINE_CASES = {
  'a rotation in the first half of the time of a translation': timelinesOf(
    [
      ['rotate', '0deg', '90deg', { duration: 600 }],
      ['translateX', 0, 100, { duration: 1200 }],
    ],
    1200
  ),
  'a rotation with a delay beside a translation': timelinesOf(
    [
      ['translateX', 0, 100, { duration: 1200 }],
      ['rotate', '30deg', '90deg', { duration: 600, delays: [360] }],
    ],
    1200
  ),
  'three operations with three durations': timelinesOf(
    [
      ['translateX', 0, 80, { duration: 1200, easing: 'default' }],
      ['scale', 0.5, 1.2, { duration: 720 }],
      ['rotate', '0deg', '60deg', { duration: 420 }],
    ],
    1200
  ),
  'an operation alone with the default easing, a hold, and a second move':
    timelinesOf(
      [
        [
          'translateX',
          0,
          20,
          {
            via: [{ to: 80, duration: 500, easing: 'default' }],
            delay: 300,
            duration: 600,
          },
        ],
      ],
      1400
    ),
  'a plain value of an operation beside an operation that moves': timelinesOf(
    [
      ['rotate', '0deg', '90deg', { duration: 900 }],
      ['translateX', 0, 30, { isPlain: true }],
    ],
    900
  ),
  'an operation that keeps its value for a longer time than the operation that moves':
    keptValueOf(1200, 600),
  'an operation that keeps its value for a shorter time than the operation that moves':
    keptValueOf(400, 1000),
  'a first part with no duration before a part with a duration': timelinesOf(
    [
      ['translateX', 0, 0, { via: [{ to: 40, duration: 0 }], duration: 800 }],
      ['scaleY', 1, 1.5, { duration: 400 }],
    ],
    800
  ),
  'an operation with control points beside an operation with a fitted easing function':
    timelinesOf(
      [
        [
          'translateX',
          0,
          100,
          { duration: 1200, easing: Easing.bezier(0.3, 0, 0.7, 1) },
        ],
        ['rotate', '0deg', '90deg', { duration: 840, easing: Easing.bounce }],
      ],
      1200
    ),
  'a hold between two moves of one operation while another operation moves':
    timelinesOf(
      [
        [
          'translateY',
          0,
          0,
          { via: [{ to: -40, duration: 360 }], delay: 240, duration: 360 },
        ],
        ['translateX', 0, 90, { duration: 1200 }],
      ],
      1200
    ),
  'a new start with other end values while one operation holds and one moves':
    timelinesOf(HELD_AND_MOVING, 1000, {
      replacement: {
        leaves: {},
        operations: [
          ['translateX', 80, 10, { duration: 1000 }],
          ['translateY', 24, 0, { duration: 500 }],
        ],
      },
      places: BACK_AT_START,
      commitTimesMs: [HELD_AND_MOVING_COMMIT_MS],
    }),
} satisfies Record<string, ReferenceCase>;

export const LIVE_CLOCK_CASES: Record<string, ReferenceCase> = {
  ...CURVE_CASES,
  ...HELD_SIZE_CASES,
  ...HOLD_AFTER_TRACK_CASES,
  ...ONE_OPERATION_CASES,
  ...TRANSFORM_CASES,
  ...CONTINUITY_CASES,
  ...STYLE_COMMIT_CASES,
  ...OPERATION_TIMELINE_CASES,
};
