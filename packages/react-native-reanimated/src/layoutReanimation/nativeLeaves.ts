'use strict';
import type { EasingCurveFits } from '../animation/nativeEasingCurve';
import { fitEasingCurveOnce } from '../animation/nativeEasingCurve';
import { withPlainValue } from '../animation/styleAnimation';
import { recognizePrefixSuffix } from '../animation/utilCommon';
import type {
  AnimationObject,
  NativeEasing,
  NativeLeafSegment,
  NativeLeafTrack,
  NativeTimingDescription,
  NativeTimingPhase,
  NativeTransformOperation,
} from '../commonTypes';

/**
 * How the frame driver starts a leaf on a view that has a live leaf for the
 * same key. `continues`: the live leaf keeps its timeline. `replaces`: the new
 * leaf starts from its initial value at once. `frameDriver`: the result has no
 * native form.
 */
export type LiveLeafRelation = 'continues' | 'replaces' | 'frameDriver';

/** One operation of a `transform` leaf: its one key is the operation kind. */
export type TransformOperationLeaf = Record<string, AnimationObject>;

/** The animation of a scalar key, or the operations of `transform`. */
export type NativeLeaf = AnimationObject | TransformOperationLeaf[];

type LeafSummary = { initialValue: unknown; track?: NativeLeafTrack };

/** The sum of the holds of a leaf, then its one timing. */
type LeafTimeline = { delayMs: number; timing: NativeTimingPhase };

/** The easing of a timing in segments of progress from 0 to 1. */
type ProgressSegment = Omit<NativeLeafSegment, 'endValue'> & {
  endProgress: number;
};

const ANGLE_KINDS = ['rotate', 'rotateX', 'rotateY', 'rotateZ'];
const RADIANS_IN_UNIT: Record<string, number> = {
  deg: Math.PI / 180,
  rad: 1,
};

const PROGRESS_TOLERANCE = 0.001;
const POINTS_TOLERANCE = 0.25;
const KEYS_IN_POINTS = ['originX', 'originY', 'width', 'height'];
const STRAIGHT_LINE: ProgressSegment[] = [{ endOffset: 1, endProgress: 1 }];
const AT_REST: LeafTimeline = {
  delayMs: 0,
  timing: {
    kind: 'timing',
    durationMs: 0,
    toValue: 0,
    easing: { kind: 'linear' },
  },
};

function kindOf(operation: TransformOperationLeaf): string {
  'worklet';
  return Object.keys(operation)[0];
}

function timingOf(
  description: NativeTimingDescription | undefined
): NativeTimingPhase | undefined {
  'worklet';
  const lastPhase = description?.phases[description.phases.length - 1];
  return lastPhase?.kind === 'timing' ? lastPhase : undefined;
}

function hasSameEasing(live: NativeEasing, next: NativeEasing): boolean {
  'worklet';
  if (live.kind === 'cubicBezier' && next.kind === 'cubicBezier') {
    return live.controlPoints.every(
      (point, index) => point === next.controlPoints[index]
    );
  }
  if (live.kind === 'function' && next.kind === 'function') {
    return live.easing === next.easing;
  }
  return live.kind === next.kind;
}

function hasSameCurve(
  live: NativeTimingPhase | undefined,
  next: NativeTimingPhase | undefined
): boolean {
  'worklet';
  return (
    !!live &&
    !!next &&
    live.durationMs === next.durationMs &&
    hasSameEasing(live.easing, next.easing)
  );
}

function hasUnit(animation: AnimationObject): boolean {
  'worklet';
  return typeof timingOf(animation.__nativeTiming)?.toValue === 'string';
}

function timelineOf(animation: unknown): LeafTimeline | undefined {
  'worklet';
  const { reduceMotion, __nativeTiming } = (animation ?? {}) as AnimationObject;
  if (reduceMotion || !__nativeTiming) {
    return undefined;
  }
  const { phases } = __nativeTiming;
  let delayMs = 0;
  let index = 0;
  while (phases[index].kind === 'hold') {
    delayMs += phases[index++].durationMs;
  }
  const timing = phases[index];
  return index === phases.length - 1 && timing.kind === 'timing'
    ? { delayMs, timing }
    : undefined;
}

/** The end of each phase but the last, from the start of the animation. */
function stepTimesOf(description: NativeTimingDescription | undefined) {
  'worklet';
  const stepTimes: number[] = [];
  let phaseEnd = 0;
  for (const { durationMs } of description?.phases.slice(0, -1) ?? []) {
    phaseEnd += durationMs;
    stepTimes.push(phaseEnd);
  }
  return stepTimes;
}

/**
 * Has no result for an easing function with no fit. The control points of a
 * fitted segment make its easing a cubic polynomial of time.
 */
function progressSegmentsOf(
  easing: NativeEasing,
  tolerance: number,
  fits: EasingCurveFits
): ProgressSegment[] | undefined {
  'worklet';
  if (easing.kind === 'linear') {
    return STRAIGHT_LINE;
  }
  if (easing.kind === 'cubicBezier') {
    return [
      { endOffset: 1, endProgress: 1, cubicBezier: easing.controlPoints },
    ];
  }
  const segments: ProgressSegment[] = [];
  let startProgress = 0;
  const pieces = fitEasingCurveOnce(fits, easing.easing, tolerance) ?? [];
  for (const piece of pieces) {
    const { endOffset, endProgress, controlProgress } = piece;
    const rise = endProgress - startProgress;
    const controlOf = (control: number) => (control - startProgress) / rise;
    segments.push(
      rise === 0
        ? { endOffset, endProgress }
        : {
            endOffset,
            endProgress,
            cubicBezier: [
              1 / 3,
              controlOf(controlProgress[0]),
              2 / 3,
              controlOf(controlProgress[1]),
            ],
          }
    );
    startProgress = endProgress;
  }
  return segments.length > 0 ? segments : undefined;
}

/**
 * `valueAt` gives the value of the leaf at a progress of its timing. A leaf
 * that does not change its value, or that has no duration, needs no easing.
 */
function trackOf<TValue>(
  { delayMs, timing }: LeafTimeline,
  changesValue: boolean,
  tolerance: number,
  fits: EasingCurveFits,
  valueAt: (progress: number) => TValue
): NativeLeafTrack<TValue> | undefined {
  'worklet';
  const { durationMs, easing } = timing;
  const segments =
    changesValue && durationMs > 0
      ? progressSegmentsOf(easing, tolerance, fits)
      : STRAIGHT_LINE;
  return (
    segments && {
      delayMs,
      durationMs,
      segments: segments.map(({ endProgress, ...segment }) => ({
        ...segment,
        endValue: valueAt(endProgress),
      })),
    }
  );
}

function valueBetween(start: number, end: number, progress: number): number {
  'worklet';
  return progress === 1 ? end : start + (end - start) * progress;
}

/**
 * The native scalar of a value of an operation. A string has a native form only
 * as an angle in degrees or radians.
 */
function nativeScalarOf(kind: string, value: unknown): number | undefined {
  'worklet';
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value !== 'string' || !ANGLE_KINDS.includes(kind)) {
    return undefined;
  }
  const { prefix, suffix, strippedValue } = recognizePrefixSuffix(value);
  const radiansInUnit = RADIANS_IN_UNIT[suffix ?? ''];
  return prefix || !radiansInUnit ? undefined : strippedValue * radiansInUnit;
}

/** The frame driver gives the end value the unit of the start value. */
function hasSameUnit(start: unknown, end: unknown): boolean {
  'worklet';
  if (typeof start !== 'string' || typeof end !== 'string') {
    return typeof start === typeof end;
  }
  return (
    recognizePrefixSuffix(start).suffix === recognizePrefixSuffix(end).suffix
  );
}

function isAtRest({ delayMs, timing }: LeafTimeline): boolean {
  'worklet';
  return timing.durationMs === 0 && delayMs === 0;
}

function advanceAnimation(
  animation: AnimationObject,
  initialValue: unknown,
  originMs: number,
  now: number
): void {
  'worklet';
  if (animation.finished) {
    return;
  }
  animation.onStart(animation, initialValue, originMs, null);
  // A wrapper starts its next animation in the frame in which a phase ends.
  for (const stepTime of stepTimesOf(animation.__nativeTiming)) {
    if (originMs + stepTime >= now) {
      break;
    }
    animation.onFrame(animation, originMs + stepTime);
  }
  if (animation.onFrame(animation, now)) {
    animation.finished = true;
  }
}

function hasSameOperations(
  live: TransformOperationLeaf[],
  next: NativeLeaf
): next is TransformOperationLeaf[] {
  'worklet';
  return (
    Array.isArray(next) &&
    next.length === live.length &&
    live.every((operation, index) => kindOf(operation) in next[index])
  );
}

function relateAnimations(
  live: AnimationObject,
  next: AnimationObject | undefined
): LiveLeafRelation {
  'worklet';
  const isLiveTiming = live.type === 'timing';
  if (!next) {
    // A merged delay starts again. A merged timing keeps its start time; with a unit it starts again
    // from the value on screen.
    return isLiveTiming && !hasUnit(live) ? 'continues' : 'frameDriver';
  }
  if (next.type !== 'timing') {
    // A delay runs the live leaf until it ends. Other animations have no native form.
    return 'frameDriver';
  }
  const keepsStartTime =
    isLiveTiming && live.toValue === next.toValue && !!live.startTime;
  if (!keepsStartTime) {
    return 'replaces';
  }
  return hasSameCurve(
    timingOf(live.__nativeTiming),
    timingOf(next.__nativeTiming)
  )
    ? 'continues'
    : 'frameDriver';
}

/**
 * The native form has one timeline for all operations. An operation with no
 * delay and no duration has its end value from the start.
 */
function summarizeTransformLeaf(
  initialValue: unknown,
  leaf: Record<string, unknown>[],
  fits: EasingCurveFits
): LeafSummary {
  'worklet';
  const starts: NativeTransformOperation[] = [];
  const ends: NativeTransformOperation[] = [];
  const timelines: (LeafTimeline | undefined)[] = [];
  for (let index = 0; index < leaf.length; index++) {
    const kinds = Object.keys(leaf[index] ?? {});
    const kind = kinds[0];
    const timeline = timelineOf(leaf[index]?.[kind]);
    const toValue = timeline?.timing.toValue;
    const initial = (initialValue as Record<string, unknown>[] | undefined)?.[
      index
    ]?.[kind];
    const start = nativeScalarOf(kind, initial);
    const end = timeline ? nativeScalarOf(kind, toValue) : start;
    const hasNativeValues =
      kinds.length === 1 &&
      start !== undefined &&
      end !== undefined &&
      (!timeline || hasSameUnit(initial, toValue));
    if (!hasNativeValues) {
      return { initialValue: undefined };
    }
    const startsAtEnd = timeline !== undefined && isAtRest(timeline);
    starts.push({ kind, value: startsAtEnd ? end : start });
    ends.push({ kind, value: end });
    timelines.push(timeline);
  }
  const moving = timelines.filter(
    (timeline): timeline is LeafTimeline => !!timeline && !isAtRest(timeline)
  );
  const shared = moving[0] ?? AT_REST;
  const hasOneTimeline =
    !timelines.includes(undefined) &&
    moving.every(
      ({ delayMs, timing }) =>
        delayMs === shared.delayMs && hasSameCurve(timing, shared.timing)
    );
  if (!hasOneTimeline) {
    return { initialValue: starts };
  }
  const changesValue = starts.some(
    ({ value }, index) => value !== ends[index].value
  );
  const track = trackOf(
    shared,
    changesValue,
    PROGRESS_TOLERANCE,
    fits,
    (progress) =>
      starts.map(({ kind, value }, index) => ({
        kind,
        value: valueBetween(value, ends[index].value, progress),
      }))
  );
  return { initialValue: starts, track };
}

/**
 * The tolerance of the fit of an easing function, as a part of the change of
 * the value: 0.001, and for a value in points no more than 0.25 pt. Each
 * smaller tolerance is a half of the one before it, so that one function has
 * few fits.
 */
function fitToleranceOf(key: string, change: number): number {
  'worklet';
  const halvings = KEYS_IN_POINTS.includes(key)
    ? Math.ceil(Math.log2((change * PROGRESS_TOLERANCE) / POINTS_TOLERANCE))
    : 0;
  return PROGRESS_TOLERANCE / 2 ** Math.max(0, halvings);
}

/**
 * What the native route reads from the leaf of `key` of a builder result. A
 * scalar leaf has a track only when its values are numbers. `fits` keeps the
 * fit of each easing function.
 */
export function summarizeNativeLeaf(
  key: string,
  initialValue: unknown,
  leaf: unknown,
  fits: EasingCurveFits
): LeafSummary {
  'worklet';
  if (Array.isArray(leaf)) {
    return summarizeTransformLeaf(initialValue, leaf, fits);
  }
  const timeline = timelineOf(leaf);
  const end = timeline?.timing.toValue;
  if (
    !timeline ||
    typeof end !== 'number' ||
    typeof initialValue !== 'number'
  ) {
    return { initialValue };
  }
  const change = Math.abs(end - initialValue);
  const track = trackOf(
    timeline,
    change > 0,
    fitToleranceOf(key, change),
    fits,
    (progress) => valueBetween(initialValue, end, progress)
  );
  return { initialValue, track };
}

/** The frame driver gives each operation that is a plain value an animation. */
export function animatePlainOperations(
  operations: Record<string, unknown>[]
): void {
  'worklet';
  for (const operation of operations) {
    for (const kind of Object.keys(operation ?? {})) {
      const value = operation[kind];
      if (typeof value === 'number' || typeof value === 'string') {
        operation[kind] = withPlainValue(value);
      }
    }
  }
}

/**
 * Brings a leaf whose track plays natively to the state that the frame driver
 * gives it at `now`.
 */
export function advanceNativeLeaf(
  leaf: NativeLeaf,
  initialValue: unknown,
  originMs: number,
  now: number
): void {
  'worklet';
  if (!Array.isArray(leaf)) {
    advanceAnimation(leaf, initialValue, originMs, now);
    return;
  }
  const initialOperations = initialValue as Record<string, unknown>[];
  leaf.forEach((operation, index) => {
    const kind = kindOf(operation);
    advanceAnimation(
      operation[kind],
      initialOperations[index][kind],
      originMs,
      now
    );
  });
}

/**
 * The times, from the start of the leaves, at which a phase of one of them ends
 * and another phase follows. The earliest time is first.
 */
export function phaseEndsOf(leaves: NativeLeaf[]): number[] {
  'worklet';
  const animations = leaves.flatMap((leaf) =>
    Array.isArray(leaf)
      ? leaf.map((operation) => operation[kindOf(operation)])
      : [leaf]
  );
  const phaseEnds = animations.flatMap((animation) =>
    stepTimesOf(animation.__nativeTiming)
  );
  return [...new Set(phaseEnds)].sort((first, second) => first - second);
}

/** The value on screen of a leaf that `advanceNativeLeaf` brought to a time. */
export function currentOfNativeLeaf(leaf: NativeLeaf): unknown {
  'worklet';
  if (!Array.isArray(leaf)) {
    return leaf.current;
  }
  return leaf.map((operation) => {
    const kind = kindOf(operation);
    return { [kind]: operation[kind].current };
  });
}

/**
 * `live` is in its state at the start time of `next` (`advanceNativeLeaf`).
 * `next` is absent when the new animation has no leaf for the key. The
 * operations of a `transform` leaf have one relation only when each of them has
 * it.
 */
export function relateToLiveLeaf(
  live: NativeLeaf,
  next: NativeLeaf | undefined
): LiveLeafRelation {
  'worklet';
  if (!Array.isArray(live)) {
    return relateAnimations(live, next as AnimationObject | undefined);
  }
  if (next && !hasSameOperations(live, next)) {
    return 'frameDriver';
  }
  const relations = live.map((operation, index) => {
    const kind = kindOf(operation);
    return relateAnimations(operation[kind], next?.[index][kind]);
  });
  return relations.every((relation) => relation === relations[0])
    ? relations[0]
    : 'frameDriver';
}
