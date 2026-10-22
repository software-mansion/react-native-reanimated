'use strict';
import type { EasingFunction } from '../commonTypes';

/**
 * One piece of an easing: a cubic polynomial of time from the end of the piece
 * before it to `endOffset`. Its Bezier ordinates are the progress at its start,
 * the two values of `controlProgress`, and `endProgress`.
 */
export type EasingCurvePiece = {
  endOffset: number;
  endProgress: number;
  controlProgress: [number, number];
};

type Span = {
  start: number;
  end: number;
  startProgress: number;
  endProgress: number;
};

const LARGEST_PIECE_COUNT = 64;
const LEAST_PIECE_WIDTH = 1 / 1024;
const CHECKPOINT_COUNT = 32;

/**
 * The cubic polynomial through the easing at the ends and at the thirds of the
 * span. A piece with equal ends that moves between them has no form as one
 * segment of a track, so it has no result.
 */
function fitPiece(
  easing: EasingFunction,
  { start, end, startProgress, endProgress }: Span,
  tolerance: number
): EasingCurvePiece | undefined {
  'worklet';
  const width = end - start;
  const atThird = easing(start + width / 3);
  const atTwoThirds = easing(start + (2 * width) / 3);
  const control1 =
    (-5 * startProgress + 18 * atThird - 9 * atTwoThirds + 2 * endProgress) / 6;
  const control2 =
    (2 * startProgress - 9 * atThird + 18 * atTwoThirds - 5 * endProgress) / 6;
  const isConstant = control1 === startProgress && control2 === startProgress;
  if (startProgress === endProgress && !isConstant) {
    return undefined;
  }
  for (let index = 0; index < CHECKPOINT_COUNT; index++) {
    const u = (index + 0.5) / CHECKPOINT_COUNT;
    const v = 1 - u;
    const fitted =
      v * v * v * startProgress +
      3 * v * v * u * control1 +
      3 * v * u * u * control2 +
      u * u * u * endProgress;
    if (!(Math.abs(fitted - easing(start + u * width)) <= tolerance)) {
      return undefined;
    }
  }
  return { endOffset: end, endProgress, controlProgress: [control1, control2] };
}

/**
 * Gives the pieces of an easing that goes from 0 to 1. Each piece is no more
 * than `tolerance` of progress from the easing at each of its checkpoints. Has
 * no result for an easing that needs a piece below the least width or more
 * pieces than the largest count.
 */
export function fitEasingCurve(
  easing: EasingFunction,
  tolerance: number
): EasingCurvePiece[] | undefined {
  'worklet';
  const startsAtZero = Math.abs(easing(0)) <= tolerance;
  const endsAtOne = Math.abs(easing(1) - 1) <= tolerance;
  if (!startsAtZero || !endsAtOne) {
    return undefined;
  }
  const pieces: EasingCurvePiece[] = [];
  const spans: Span[] = [
    { start: 0, end: 1, startProgress: 0, endProgress: 1 },
  ];
  while (spans.length > 0) {
    const span = spans.pop()!;
    const piece = fitPiece(easing, span, tolerance);
    if (piece) {
      pieces.push(piece);
      continue;
    }
    const middle = (span.start + span.end) / 2;
    const isOverLimit =
      middle - span.start < LEAST_PIECE_WIDTH ||
      pieces.length + spans.length + 2 > LARGEST_PIECE_COUNT;
    if (isOverLimit) {
      return undefined;
    }
    const middleProgress = easing(middle);
    spans.push(
      { ...span, start: middle, startProgress: middleProgress },
      { ...span, end: middle, endProgress: middleProgress }
    );
  }
  return pieces;
}

export type EasingCurveFits = WeakMap<
  EasingFunction,
  Map<number, EasingCurvePiece[] | undefined>
>;

/** The easing must be pure: each later call gives the first fit. */
export function fitEasingCurveOnce(
  fits: EasingCurveFits,
  easing: EasingFunction,
  tolerance: number
): EasingCurvePiece[] | undefined {
  'worklet';
  let fitsOfEasing = fits.get(easing);
  if (!fitsOfEasing) {
    fitsOfEasing = new Map();
    fits.set(easing, fitsOfEasing);
  }
  if (!fitsOfEasing.has(tolerance)) {
    fitsOfEasing.set(tolerance, fitEasingCurve(easing, tolerance));
  }
  return fitsOfEasing.get(tolerance);
}
