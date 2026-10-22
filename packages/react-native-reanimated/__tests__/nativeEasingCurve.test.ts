import { Easing } from '../src';
import type {
  EasingCurveFits,
  EasingCurvePiece,
} from '../src/animation/nativeEasingCurve';
import {
  fitEasingCurve,
  fitEasingCurveOnce,
} from '../src/animation/nativeEasingCurve';
import type { EasingFunction } from '../src/commonTypes';

const TOLERANCE = 0.001;
const DENSE_POINTS = 10001;
// The constants of the cubic fit.
const LARGEST_PIECE_COUNT = 64;
const LEAST_PIECE_WIDTH = 1 / 1024;
const CHECKPOINT_COUNT = 32;

const NAMED: Record<string, EasingFunction> = {
  quad: Easing.quad,
  cubic: Easing.cubic,
  'poly(4)': Easing.poly(4),
  'poly(5)': Easing.poly(5),
  'poly(2.5)': Easing.poly(2.5),
  sin: Easing.sin,
  circle: Easing.circle,
  exp: Easing.exp,
  'elastic(1)': Easing.elastic(1),
  'elastic(2)': Easing.elastic(2),
  'back(1.70158)': Easing.back(),
  bounce: Easing.bounce,
  ease: Easing.ease,
  'bezierFn(0.3, 0, 0.7, 1)': Easing.bezierFn(0.3, 0, 0.7, 1),
};

const DIRECTIONS: Record<string, (easing: EasingFunction) => EasingFunction> = {
  in: Easing.in,
  out: Easing.out,
  inOut: Easing.inOut,
};

const CORPUS: [string, EasingFunction][] = Object.entries(NAMED).flatMap(
  ([name, easing]) =>
    Object.entries(DIRECTIONS).map(
      ([direction, apply]): [string, EasingFunction] => [
        `${direction}(${name})`,
        apply(easing),
      ]
    )
);

function valueAt(pieces: EasingCurvePiece[], time: number) {
  let start = 0;
  let startProgress = 0;
  for (const { endOffset, endProgress, controlProgress } of pieces) {
    if (time <= endOffset) {
      const u = (time - start) / (endOffset - start);
      const v = 1 - u;
      return (
        v * v * v * startProgress +
        3 * v * v * u * controlProgress[0] +
        3 * v * u * u * controlProgress[1] +
        u * u * u * endProgress
      );
    }
    start = endOffset;
    startProgress = endProgress;
  }
  return NaN;
}

function denseError(pieces: EasingCurvePiece[], easing: EasingFunction) {
  let error = 0;
  for (let index = 0; index < DENSE_POINTS; index++) {
    const time = index / (DENSE_POINTS - 1);
    error = Math.max(error, Math.abs(valueAt(pieces, time) - easing(time)));
  }
  return error;
}

type LinearPiece = { endOffset: number; endProgress: number };

type Span = {
  start: number;
  end: number;
  startProgress: number;
  endProgress: number;
};

function isLineInTolerance(
  easing: EasingFunction,
  { start, end, startProgress, endProgress }: Span,
  tolerance: number
) {
  for (let index = 0; index < CHECKPOINT_COUNT; index++) {
    const u = (index + 0.5) / CHECKPOINT_COUNT;
    const line = startProgress + u * (endProgress - startProgress);
    if (!(Math.abs(line - easing(start + u * (end - start))) <= tolerance)) {
      return false;
    }
  }
  return true;
}

/**
 * Linear pieces with the ends, the cuts, the checkpoints, and the refusal rules
 * of the cubic fit.
 */
function fitLinearPieces(
  easing: EasingFunction,
  tolerance: number,
  largestPieceCount: number
): LinearPiece[] | undefined {
  const startsAtZero = Math.abs(easing(0)) <= tolerance;
  const endsAtOne = Math.abs(easing(1) - 1) <= tolerance;
  if (!startsAtZero || !endsAtOne) {
    return undefined;
  }
  const pieces: LinearPiece[] = [];
  const spans: Span[] = [
    { start: 0, end: 1, startProgress: 0, endProgress: 1 },
  ];
  while (spans.length > 0) {
    const span = spans.pop()!;
    if (isLineInTolerance(easing, span, tolerance)) {
      pieces.push({ endOffset: span.end, endProgress: span.endProgress });
      continue;
    }
    const middle = (span.start + span.end) / 2;
    const isOverLimit =
      middle - span.start < LEAST_PIECE_WIDTH ||
      pieces.length + spans.length + 2 > largestPieceCount;
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

function linearDenseError(pieces: LinearPiece[], easing: EasingFunction) {
  let error = 0;
  let index = 0;
  let start = 0;
  let startProgress = 0;
  for (let point = 0; point < DENSE_POINTS; point++) {
    const time = point / (DENSE_POINTS - 1);
    while (time > pieces[index].endOffset) {
      start = pieces[index].endOffset;
      startProgress = pieces[index].endProgress;
      index++;
    }
    const { endOffset, endProgress } = pieces[index];
    const u = (time - start) / (endOffset - start);
    const line = startProgress + u * (endProgress - startProgress);
    error = Math.max(error, Math.abs(line - easing(time)));
  }
  return error;
}

function counted(easing: EasingFunction) {
  const counter = { calls: 0 };
  return {
    counter,
    easing: (time: number) => {
      counter.calls++;
      return easing(time);
    },
  };
}

describe('fitEasingCurve', () => {
  test('the default easing is two exact pieces after 74 calls of the easing', () => {
    const { counter, easing } = counted(Easing.inOut(Easing.quad));
    const pieces = fitEasingCurve(easing, TOLERANCE)!;
    expect(counter.calls).toBe(74);
    expect(pieces).toHaveLength(2);
    const [first, second] = pieces;
    expect(first.endOffset).toBe(0.5);
    expect(first.endProgress).toBe(0.5);
    expect(first.controlProgress[0]).toBeCloseTo(0, 12);
    expect(first.controlProgress[1]).toBeCloseTo(1 / 6, 12);
    expect(second.endOffset).toBe(1);
    expect(second.endProgress).toBe(1);
    expect(second.controlProgress[0]).toBeCloseTo(5 / 6, 12);
    expect(second.controlProgress[1]).toBeCloseTo(1, 12);
    expect(denseError(pieces, Easing.inOut(Easing.quad))).toBeLessThan(1e-12);
  });

  test.each([
    ['linear', Easing.linear],
    ['quad', Easing.quad],
    ['cubic', Easing.cubic],
    ['out(cubic)', Easing.out(Easing.cubic)],
    ['back', Easing.back()],
  ])('%s is one exact piece', (_, easing) => {
    const pieces = fitEasingCurve(easing, TOLERANCE)!;
    expect(pieces).toHaveLength(1);
    expect(denseError(pieces, easing)).toBeLessThan(1e-12);
  });

  test('the corpus: the piece count, the calls of the easing, and the count of linear pieces with the largest count of the fit and with no largest count', () => {
    const linearCount = (easing: EasingFunction, largestPieceCount: number) =>
      fitLinearPieces(easing, TOLERANCE, largestPieceCount)?.length ??
      'refused';
    const table = CORPUS.map(([name, easing]) => {
      const { counter, easing: countedEasing } = counted(easing);
      const pieces = fitEasingCurve(countedEasing, TOLERANCE);
      return [
        name,
        pieces?.length ?? 'refused',
        counter.calls,
        linearCount(easing, LARGEST_PIECE_COUNT),
        linearCount(easing, Infinity),
      ].join(' | ');
    });
    expect(table).toEqual([
      'in(quad) | 1 | 36 | 16 | 16',
      'out(quad) | 1 | 36 | 16 | 16',
      'inOut(quad) | 2 | 74 | 32 | 32',
      'in(cubic) | 1 | 36 | 26 | 26',
      'out(cubic) | 1 | 36 | 26 | 26',
      'inOut(cubic) | 2 | 74 | 40 | 40',
      'in(poly(4)) | 2 | 74 | 29 | 29',
      'out(poly(4)) | 2 | 74 | 29 | 29',
      'inOut(poly(4)) | 4 | 150 | 40 | 40',
      'in(poly(5)) | 4 | 177 | 30 | 30',
      'out(poly(5)) | 4 | 154 | 30 | 30',
      'inOut(poly(5)) | 6 | 230 | 42 | 42',
      'in(poly(2.5)) | 2 | 75 | 27 | 27',
      'out(poly(2.5)) | 2 | 76 | 27 | 27',
      'inOut(poly(2.5)) | 4 | 178 | 30 | 30',
      'in(sin) | 2 | 75 | 21 | 21',
      'out(sin) | 2 | 75 | 21 | 21',
      'inOut(sin) | 4 | 178 | 28 | 28',
      'in(circle) | refused | 437 | refused | refused',
      'out(circle) | refused | 45 | refused | refused',
      'inOut(circle) | refused | 428 | refused | refused',
      'in(exp) | 4 | 151 | 31 | 31',
      'out(exp) | 4 | 151 | 31 | 31',
      'inOut(exp) | 8 | 330 | 44 | 44',
      'in(elastic(1)) | 5 | 215 | 38 | 38',
      'out(elastic(1)) | 5 | 191 | 38 | 38',
      'inOut(elastic(1)) | 8 | 302 | 56 | 56',
      'in(elastic(2)) | 8 | 303 | 56 | 56',
      'out(elastic(2)) | 8 | 306 | 56 | 56',
      'inOut(elastic(2)) | 16 | 638 | refused | 80',
      'in(back(1.70158)) | 1 | 36 | 36 | 36',
      'out(back(1.70158)) | 1 | 36 | 36 | 36',
      'inOut(back(1.70158)) | 2 | 74 | 48 | 48',
      'in(bounce) | 22 | 877 | refused | refused',
      'out(bounce) | 22 | 945 | refused | refused',
      'inOut(bounce) | 38 | 1544 | refused | refused',
      'in(ease) | 2 | 74 | 20 | 20',
      'out(ease) | 2 | 74 | 20 | 20',
      'inOut(ease) | 4 | 153 | 32 | 32',
      'in(bezierFn(0.3, 0, 0.7, 1)) | 4 | 177 | 26 | 26',
      'out(bezierFn(0.3, 0, 0.7, 1)) | 4 | 177 | 26 | 26',
      'inOut(bezierFn(0.3, 0, 0.7, 1)) | 4 | 152 | 36 | 36',
    ]);
  });

  test.each(CORPUS)(
    '%s: each accepted fit is inside the tolerance at 10001 points',
    (_, easing) => {
      const pieces = fitEasingCurve(easing, TOLERANCE);
      if (pieces) {
        expect(denseError(pieces, easing)).toBeLessThanOrEqual(TOLERANCE);
        expect(pieces[pieces.length - 1].endOffset).toBe(1);
        expect(pieces[pieces.length - 1].endProgress).toBe(1);
      }
    }
  );

  test.each(CORPUS)(
    '%s: each accepted fit of linear pieces is inside the tolerance at 10001 points',
    (_, easing) => {
      const pieces = fitLinearPieces(easing, TOLERANCE, Infinity);
      if (pieces) {
        expect(linearDenseError(pieces, easing)).toBeLessThanOrEqual(TOLERANCE);
      }
    }
  );

  test.each([
    ['steps(2)', Easing.steps(2)],
    ['steps(10)', Easing.steps(10)],
    ['steps(4, false)', Easing.steps(4, false)],
    ['circle', Easing.circle],
    ['an easing that is not a number', () => NaN],
    ['an easing that starts at 0.5', (time: number) => 0.5 + time / 2],
    ['an easing that ends at 0.5', (time: number) => time / 2],
  ])('%s has no fit', (_, easing) => {
    expect(fitEasingCurve(easing, TOLERANCE)).toBeUndefined();
  });

  test('an easing that starts inside the tolerance of 0 starts at 0, and has no fit with a smaller tolerance', () => {
    expect(Easing.exp(0)).toBe(2 ** -10);
    const pieces = fitEasingCurve(Easing.exp, TOLERANCE)!;
    expect(valueAt(pieces, 0)).toBe(0);
    expect(fitEasingCurve(Easing.exp, 0.0005)).toBeUndefined();
    expect(fitEasingCurve(Easing.out(Easing.exp), 0.0005)).toBeUndefined();
  });

  test('a smaller tolerance gives more pieces', () => {
    const counts = [0.001, 0.0001, 0.00001].map(
      (tolerance) => fitEasingCurve(Easing.sin, tolerance)?.length
    );
    expect(counts).toEqual([2, 3, 6]);
  });

  test('a factory makes a new function for each call: each function has its own fit, and the pieces are equal', () => {
    const fits: EasingCurveFits = new WeakMap();
    const first = Easing.poly(4);
    const second = Easing.poly(4);
    expect(first).not.toBe(second);

    const firstPieces = fitEasingCurveOnce(fits, first, TOLERANCE);
    const secondPieces = fitEasingCurveOnce(fits, second, TOLERANCE);
    expect(secondPieces).toEqual(firstPieces);
    expect(secondPieces).not.toBe(firstPieces);
    expect(fitEasingCurveOnce(fits, first, TOLERANCE)).toBe(firstPieces);
  });

  test('a part with no change is one constant piece', () => {
    const easing = (time: number) => Math.min(1, 2 * time);
    expect(fitEasingCurve(easing, TOLERANCE)).toEqual([
      { endOffset: 0.5, endProgress: 1, controlProgress: [1 / 3, 2 / 3] },
      { endOffset: 1, endProgress: 1, controlProgress: [1, 1] },
    ]);
  });

  test('no piece has equal ends and a move between them', () => {
    const easing = (time: number) =>
      time < 0.5 ? 2 * time : 1 + 0.1 * Math.sin(4 * Math.PI * (time - 0.5));
    const pieces = fitEasingCurve(easing, TOLERANCE)!;
    expect(denseError(pieces, easing)).toBeLessThanOrEqual(TOLERANCE);
    let startProgress = 0;
    for (const { endProgress, controlProgress } of pieces) {
      if (endProgress === startProgress) {
        expect(controlProgress).toEqual([startProgress, startProgress]);
      }
      startProgress = endProgress;
    }
    expect(pieces.length).toBeGreaterThan(3);
  });
});
