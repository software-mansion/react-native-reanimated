/*
 * The cases of the native layout suites that have a statement on the wall clock. The suite of a case plays
 * it for statements A and B of `native layout reference`, and the suite `native layout live clock` plays it
 * for the wall-clock statements.
 */
import { Easing } from 'react-native-reanimated';

import type { Place, ReferenceCase } from './nativeLayoutReferencePlay';
import type { Leaf } from './nativeLayoutTestKit';
import {
  DURATION,
  END_LEFT,
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

export const LIVE_CLOCK_CASES: Record<string, ReferenceCase> = {
  ...CURVE_CASES,
  ...HELD_SIZE_CASES,
  ...HOLD_AFTER_TRACK_CASES,
};
