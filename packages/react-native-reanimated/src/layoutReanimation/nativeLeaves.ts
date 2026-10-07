'use strict';
import type { EasingCurveFits } from '../animation/nativeEasingCurve';
import { fitEasingCurveOnce } from '../animation/nativeEasingCurve';
import { withPlainValue } from '../animation/styleAnimation';
import { recognizePrefixSuffix } from '../animation/utilCommon';
import type {
  AnimationObject,
  LayoutAnimationValues,
  NativeEasing,
  NativeHoldPhase,
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

type LoweredTrack<TValue> = {
  track?: NativeLeafTrack<TValue>;
  hasPhaseOfNoDuration?: true;
};

type LeafSummary = { initialValue: unknown } & LoweredTrack<
  number | NativeTransformOperation[]
>;

type Phase = NativeHoldPhase | NativeTimingPhase;

/** The fields of a phase that do not depend on its end value. */
type PhaseForm =
  | Pick<NativeHoldPhase, 'kind' | 'durationMs'>
  | Pick<NativeTimingPhase, 'kind' | 'durationMs' | 'easing'>;

type TimingValuePhase<TValue> = Omit<NativeTimingPhase, 'toValue'> & {
  toValue: TValue;
};

/** A phase whose end value is in the native form of its leaf. */
type ValuePhase<TValue> = NativeHoldPhase | TimingValuePhase<TValue>;

/**
 * The value that a leaf shows from its start, the sum of its first holds, then
 * the phases that follow.
 */
type Timeline<TValue> = {
  start: TValue;
  delayMs: number;
  phases: ValuePhase<TValue>[];
};

/** How the lowering reads the values of one kind of leaf. */
type ValueReader<TValue> = {
  between: (start: TValue, end: TValue, progress: number) => TValue;
  /** Has no result for equal values: they need no easing. */
  toleranceOf: (start: TValue, end: TValue) => number | undefined;
};

/**
 * What the fit of an easing function reads. `fits` keeps the fit of each easing
 * function. `lever` is the largest distance in points from the center of the
 * view to a point of the view.
 */
export type Fitting = { fits: EasingCurveFits; lever: number };

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
const KEYS_IN_POINTS = [
  'originX',
  'originY',
  'width',
  'height',
  'translateX',
  'translateY',
];
const STRAIGHT_LINE: ProgressSegment[] = [{ endOffset: 1, endProgress: 1 }];
const AT_REST: Timeline<number> = {
  start: 0,
  delayMs: 0,
  phases: [
    { kind: 'timing', durationMs: 0, toValue: 0, easing: { kind: 'linear' } },
  ],
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

function hasSameForm(
  first: PhaseForm | undefined,
  second: PhaseForm | undefined
): boolean {
  'worklet';
  if (!first || !second || first.durationMs !== second.durationMs) {
    return false;
  }
  if (first.kind === 'hold' || second.kind === 'hold') {
    return first.kind === second.kind;
  }
  return hasSameEasing(first.easing, second.easing);
}

function hasUnit(animation: AnimationObject): boolean {
  'worklet';
  return typeof timingOf(animation.__nativeTiming)?.toValue === 'string';
}

function hasManyTimings(animation: AnimationObject | undefined): boolean {
  'worklet';
  const phases = animation?.__nativeTiming?.phases ?? [];
  return phases.filter(({ kind }) => kind === 'timing').length > 1;
}

function phasesOf(animation: unknown): Phase[] | undefined {
  'worklet';
  const { reduceMotion, __nativeTiming } = (animation ?? {}) as AnimationObject;
  return reduceMotion ? undefined : __nativeTiming?.phases;
}

/**
 * A first phase with no duration, before a phase with a duration, gives its
 * value to the start. The last phase of a description is a timing.
 */
function timelineOf<TValue>(
  initialValue: TValue,
  phases: ValuePhase<TValue>[]
): Timeline<TValue> {
  'worklet';
  const [first, second] = phases;
  const jumpsAtStart =
    first.kind === 'timing' && first.durationMs === 0 && second?.durationMs > 0;
  let index = jumpsAtStart ? 1 : 0;
  let delayMs = 0;
  while (phases[index].kind === 'hold') {
    delayMs += phases[index++].durationMs;
  }
  return {
    start: jumpsAtStart ? first.toValue : initialValue,
    delayMs,
    phases: phases.slice(index),
  };
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
 * The segments of the phases of a timeline: a hold keeps the value before it,
 * and a timing has the pieces of its easing from the value before it. A phase
 * with no duration has a track form only as the one phase of the timeline.
 */
function trackOf<TValue>(
  { start, delayMs, phases }: Timeline<TValue>,
  { between, toleranceOf }: ValueReader<TValue>,
  fits: EasingCurveFits
): LoweredTrack<TValue> {
  'worklet';
  if (phases.length > 1 && phases.some(({ durationMs }) => durationMs === 0)) {
    return { hasPhaseOfNoDuration: true };
  }
  let durationMs = 0;
  for (const phase of phases) {
    durationMs += phase.durationMs;
  }
  const offsetOf = (timeMs: number) =>
    durationMs > 0 ? timeMs / durationMs : 1;
  const segments: NativeLeafSegment<TValue>[] = [];
  let phaseStartMs = 0;
  let value = start;
  for (const phase of phases) {
    if (phase.kind === 'hold') {
      segments.push({
        endOffset: offsetOf(phaseStartMs + phase.durationMs),
        endValue: value,
      });
    } else {
      const tolerance = toleranceOf(value, phase.toValue);
      const pieces =
        tolerance === undefined || phase.durationMs === 0
          ? STRAIGHT_LINE
          : progressSegmentsOf(phase.easing, tolerance, fits);
      if (!pieces) {
        return {};
      }
      for (const { endOffset, endProgress, ...piece } of pieces) {
        segments.push({
          ...piece,
          endOffset: offsetOf(phaseStartMs + endOffset * phase.durationMs),
          endValue: between(value, phase.toValue, endProgress),
        });
      }
      value = phase.toValue;
    }
    phaseStartMs += phase.durationMs;
  }
  return { track: { delayMs, durationMs, segments } };
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

function isAtRest({ delayMs, phases }: Timeline<number>): boolean {
  'worklet';
  return delayMs === 0 && phases.length === 1 && phases[0].durationMs === 0;
}

/** The timeline of an operation with no description has no phases. */
function isDescribed({ phases }: Timeline<number>): boolean {
  'worklet';
  return phases.length > 0;
}

/** The timelines of one shape have their timings at the same indices. */
function timingAt({ phases }: Timeline<number>, index: number) {
  'worklet';
  return phases[index] as TimingValuePhase<number>;
}

function hasSameShape(first: Timeline<number>, second: Timeline<number>) {
  'worklet';
  return (
    first.delayMs === second.delayMs &&
    first.phases.length === second.phases.length &&
    first.phases.every((phase, index) =>
      hasSameForm(phase, second.phases[index])
    )
  );
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
  if (hasManyTimings(live) || hasManyTimings(next)) {
    return 'frameDriver';
  }
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
  return hasSameForm(
    timingOf(live.__nativeTiming),
    timingOf(next.__nativeTiming)
  )
    ? 'continues'
    : 'frameDriver';
}

/**
 * The timeline of one operation in native scalars: with no phases for an
 * operation with no description, and no result for a value with no native
 * form.
 */
function operationTimelineOf(
  kind: string,
  initialValue: unknown,
  animation: unknown
): Timeline<number> | undefined {
  'worklet';
  const start = nativeScalarOf(kind, initialValue);
  if (start === undefined) {
    return undefined;
  }
  const valuePhases: ValuePhase<number>[] = [];
  for (const phase of phasesOf(animation) ?? []) {
    if (phase.kind === 'hold') {
      valuePhases.push(phase);
      continue;
    }
    const toValue = nativeScalarOf(kind, phase.toValue);
    if (toValue === undefined || !hasSameUnit(initialValue, phase.toValue)) {
      return undefined;
    }
    valuePhases.push({ ...phase, toValue });
  }
  return valuePhases.length > 0
    ? timelineOf(start, valuePhases)
    : { start, delayMs: 0, phases: [] };
}

/**
 * The largest error of a fit in the unit of a scalar key or of an operation
 * kind: points, or the radians that move a point of the view at `lever` by that
 * number of points. Has no result for a value with no unit.
 */
function unitToleranceOf(key: string, lever: number): number | undefined {
  'worklet';
  if (KEYS_IN_POINTS.includes(key)) {
    return POINTS_TOLERANCE;
  }
  return ANGLE_KINDS.includes(key) ? POINTS_TOLERANCE / lever : undefined;
}

/**
 * The tolerance of the fit of an easing function, as a part of the change of
 * the value: 0.001, and no more than the tolerance of the unit of the value.
 * Each smaller tolerance is a half of the one before it, so that one function
 * has few fits.
 */
function fitToleranceOf(key: string, change: number, lever: number): number {
  'worklet';
  const unitTolerance = unitToleranceOf(key, lever);
  const halvings =
    unitTolerance === undefined
      ? 0
      : Math.ceil(Math.log2((change * PROGRESS_TOLERANCE) / unitTolerance));
  return PROGRESS_TOLERANCE / 2 ** Math.max(0, halvings);
}

/**
 * The native form has one timeline for all operations: each operation that
 * changes has the phases of the others. An operation with no delay and no
 * duration has its end value from the start.
 */
function summarizeTransformLeaf(
  initialValue: unknown,
  leaf: Record<string, unknown>[],
  { fits, lever }: Fitting
): LeafSummary {
  'worklet';
  const kinds: string[] = [];
  const timelines: Timeline<number>[] = [];
  for (let index = 0; index < leaf.length; index++) {
    const operationKinds = Object.keys(leaf[index] ?? {});
    const kind = operationKinds[0];
    const initial = (initialValue as Record<string, unknown>[] | undefined)?.[
      index
    ]?.[kind];
    const timeline =
      operationKinds.length === 1
        ? operationTimelineOf(kind, initial, leaf[index][kind])
        : undefined;
    if (!timeline) {
      return { initialValue: undefined };
    }
    kinds.push(kind);
    timelines.push(timeline);
  }
  const operationsOf = (valueOf: (timeline: Timeline<number>) => number) =>
    timelines.map((timeline, index) => ({
      kind: kinds[index],
      value: valueOf(timeline),
    }));
  const starts = operationsOf((timeline) =>
    isAtRest(timeline) ? timingAt(timeline, 0).toValue : timeline.start
  );
  const moving = timelines.filter((timeline) => !isAtRest(timeline));
  const shared = moving[0] ?? AT_REST;
  const hasOneTimeline = moving.every(
    (timeline) => isDescribed(timeline) && hasSameShape(timeline, shared)
  );
  if (!hasOneTimeline) {
    return { initialValue: starts };
  }
  const phases = shared.phases.map(
    (phase, index): ValuePhase<NativeTransformOperation[]> =>
      phase.kind === 'hold'
        ? phase
        : {
            ...phase,
            toValue: operationsOf(
              (timeline) =>
                timingAt(timeline, isAtRest(timeline) ? 0 : index).toValue
            ),
          }
  );
  return {
    initialValue: starts,
    ...trackOf(
      { start: starts, delayMs: shared.delayMs, phases },
      {
        between: (start, end, progress) =>
          start.map(({ kind, value }, index) => ({
            kind,
            value: valueBetween(value, end[index].value, progress),
          })),
        toleranceOf: (start, end) => {
          const tolerances = start
            .map(({ kind, value }, index) => ({
              kind,
              change: Math.abs(end[index].value - value),
            }))
            .filter(({ change }) => change > 0)
            .map(({ kind, change }) => fitToleranceOf(kind, change, lever));
          return tolerances.length > 0 ? Math.min(...tolerances) : undefined;
        },
      },
      fits
    ),
  };
}

/**
 * The largest distance in points from the center of a view to a point of the
 * view, before or after its layout change.
 */
export function leverOf(values: Partial<LayoutAnimationValues>): number {
  'worklet';
  const width = Math.max(values.currentWidth ?? 0, values.targetWidth ?? 0);
  const height = Math.max(values.currentHeight ?? 0, values.targetHeight ?? 0);
  return Math.hypot(width, height) / 2;
}

/**
 * What the native route reads from the leaf of `key` of a builder result. A
 * scalar leaf has a track only when its values are numbers.
 */
export function summarizeNativeLeaf(
  key: string,
  initialValue: unknown,
  leaf: unknown,
  { fits, lever }: Fitting
): LeafSummary {
  'worklet';
  if (Array.isArray(leaf)) {
    return summarizeTransformLeaf(initialValue, leaf, { fits, lever });
  }
  const phases = phasesOf(leaf);
  const hasNumbers =
    typeof initialValue === 'number' &&
    phases?.every(
      (phase) => phase.kind === 'hold' || typeof phase.toValue === 'number'
    );
  if (!hasNumbers) {
    return { initialValue };
  }
  const timeline = timelineOf(initialValue, phases as ValuePhase<number>[]);
  return {
    initialValue: timeline.start,
    ...trackOf(
      timeline,
      {
        between: valueBetween,
        toleranceOf: (start, end) =>
          start === end
            ? undefined
            : fitToleranceOf(key, Math.abs(end - start), lever),
      },
      fits
    ),
  };
}

function animatePlainEntries(values: Record<string, unknown>): void {
  'worklet';
  for (const key of Object.keys(values)) {
    const value = values[key];
    if (typeof value === 'number' || typeof value === 'string') {
      values[key] = withPlainValue(value);
    }
  }
}

/**
 * The frame driver gives each scalar leaf and each operation that is a plain
 * value an animation.
 */
export function animatePlainLeaves(animations: Record<string, unknown>): void {
  'worklet';
  animatePlainEntries(animations);
  const { transform } = animations;
  for (const operation of Array.isArray(transform) ? transform : []) {
    animatePlainEntries(operation ?? {});
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
