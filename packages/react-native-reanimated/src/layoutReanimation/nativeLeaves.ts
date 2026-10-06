'use strict';
import { withPlainValue } from '../animation/styleAnimation';
import { recognizePrefixSuffix } from '../animation/utilCommon';
import type {
  AnimationObject,
  NativeLeafTiming,
  NativeTimingDescription,
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

type LeafSummary = { initialValue: unknown; timing?: NativeLeafTiming };
type AnimationTiming = NativeLeafTiming<number | string>;
type TimingCurve = Pick<NativeTimingDescription, 'durationMs' | 'cubicBezier'>;

const ANGLE_KINDS = ['rotate', 'rotateX', 'rotateY', 'rotateZ'];
const RADIANS_IN_UNIT: Record<string, number> = {
  deg: Math.PI / 180,
  rad: 1,
};

function kindOf(operation: TransformOperationLeaf): string {
  'worklet';
  return Object.keys(operation)[0];
}

function hasSameCurve(
  live: TimingCurve | undefined,
  next: TimingCurve | undefined
): boolean {
  'worklet';
  if (!live || !next || live.durationMs !== next.durationMs) {
    return false;
  }
  const liveBezier = live.cubicBezier;
  const nextBezier = next.cubicBezier;
  if (!liveBezier || !nextBezier) {
    return liveBezier === nextBezier;
  }
  return liveBezier.every((point, index) => point === nextBezier[index]);
}

function hasUnit(animation: AnimationObject): boolean {
  'worklet';
  return typeof animation.__nativeTiming?.toValue === 'string';
}

function timingOf(animation: unknown): AnimationTiming | undefined {
  'worklet';
  const { reduceMotion, __nativeTiming } = (animation ?? {}) as AnimationObject;
  if (reduceMotion || !__nativeTiming) {
    return undefined;
  }
  const { delaysMs, ...timing } = __nativeTiming;
  return {
    ...timing,
    delayMs: delaysMs.reduce((sum, each) => sum + each, 0),
  };
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

function isAtRest({ durationMs, delayMs }: AnimationTiming): boolean {
  'worklet';
  return durationMs === 0 && delayMs === 0;
}

/** The end of each delay of an animation, from its start. */
function delayEndsOf(animation: AnimationObject): number[] {
  'worklet';
  let delayEnd = 0;
  return (animation.__nativeTiming?.delaysMs ?? []).map((delayMs) => {
    delayEnd += delayMs;
    return delayEnd;
  });
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
  animation.onStart(animation, initialValue, originMs, undefined);
  // A delay starts its animation in the frame in which the delay ends.
  for (const delayEnd of delayEndsOf(animation)) {
    if (originMs + delayEnd >= now) {
      break;
    }
    animation.onFrame(animation, originMs + delayEnd);
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
  return hasSameCurve(live.__nativeTiming, next.__nativeTiming)
    ? 'continues'
    : 'frameDriver';
}

/**
 * The native form has one timing for all operations. An operation with no delay
 * and no duration has its end value from the start.
 */
function summarizeTransformLeaf(
  initialValue: unknown,
  leaf: Record<string, unknown>[]
): LeafSummary {
  'worklet';
  const starts: NativeTransformOperation[] = [];
  const ends: NativeTransformOperation[] = [];
  const timings: (AnimationTiming | undefined)[] = [];
  for (let index = 0; index < leaf.length; index++) {
    const kinds = Object.keys(leaf[index] ?? {});
    const kind = kinds[0];
    const timing = timingOf(leaf[index]?.[kind]);
    const initial = (initialValue as Record<string, unknown>[] | undefined)?.[
      index
    ]?.[kind];
    const start = nativeScalarOf(kind, initial);
    const end = timing ? nativeScalarOf(kind, timing.toValue) : start;
    const hasNativeValues =
      kinds.length === 1 &&
      start !== undefined &&
      end !== undefined &&
      (!timing || hasSameUnit(initial, timing.toValue));
    if (!hasNativeValues) {
      return { initialValue: undefined };
    }
    const startsAtEnd = timing !== undefined && isAtRest(timing);
    starts.push({ kind, value: startsAtEnd ? end : start });
    ends.push({ kind, value: end });
    timings.push(timing);
  }
  const moving = timings.filter(
    (timing): timing is AnimationTiming => !!timing && !isAtRest(timing)
  );
  const shared = moving[0] ?? { durationMs: 0, delayMs: 0 };
  const hasOneTiming =
    !timings.includes(undefined) &&
    moving.every(
      (timing) =>
        timing.delayMs === shared.delayMs && hasSameCurve(timing, shared)
    );
  if (!hasOneTiming) {
    return { initialValue: starts };
  }
  return { initialValue: starts, timing: { ...shared, toValue: ends } };
}

/**
 * What the native route reads from a leaf of a builder result. A scalar leaf
 * has a timing only for an end value that is a number.
 */
export function summarizeNativeLeaf(
  initialValue: unknown,
  leaf: unknown
): LeafSummary {
  'worklet';
  if (Array.isArray(leaf)) {
    return summarizeTransformLeaf(initialValue, leaf);
  }
  const timing = timingOf(leaf);
  return typeof timing?.toValue === 'number'
    ? { initialValue, timing: timing as NativeLeafTiming }
    : { initialValue };
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
 * The times, from the start of the leaves, at which a delay of one of them
 * ends. The earliest time is first.
 */
export function delayEndsOfLeaves(leaves: NativeLeaf[]): number[] {
  'worklet';
  const animations = leaves.flatMap((leaf) =>
    Array.isArray(leaf)
      ? leaf.map((operation) => operation[kindOf(operation)])
      : [leaf]
  );
  const delayEnds = animations.flatMap(delayEndsOf);
  return [...new Set(delayEnds)].sort((first, second) => first - second);
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
