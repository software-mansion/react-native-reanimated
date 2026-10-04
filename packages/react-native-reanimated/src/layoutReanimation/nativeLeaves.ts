'use strict';
import type { AnimationObject, NativeTimingDescription } from '../commonTypes';

/**
 * How the frame driver starts a leaf on a view that has a live leaf for the
 * same key. `continues`: the live leaf keeps its timeline. `replaces`: the new
 * leaf starts from its initial value at once. `frameDriver`: the result has no
 * native form.
 */
export type LiveLeafRelation = 'continues' | 'replaces' | 'frameDriver';

/**
 * Brings a leaf whose track plays natively to the state that the frame driver
 * gives it at `now`. Its `current` is then the value on screen.
 */
export function advanceNativeLeaf(
  leaf: AnimationObject,
  initialValue: number,
  originMs: number,
  now: number
): void {
  'worklet';
  if (leaf.finished) {
    return;
  }
  leaf.onStart(leaf, initialValue, originMs, undefined);
  // A delay starts its animation in the frame in which the delay ends.
  let delayEnd = originMs;
  for (const delayMs of leaf.__nativeTiming?.delaysMs ?? []) {
    delayEnd += delayMs;
    if (delayEnd >= now) {
      break;
    }
    leaf.onFrame(leaf, delayEnd);
  }
  if (leaf.onFrame(leaf, now)) {
    leaf.finished = true;
  }
}

function hasSameTiming(
  live: NativeTimingDescription | undefined,
  next: NativeTimingDescription | undefined
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

/**
 * `live` is in its state at the start time of `next` (`advanceNativeLeaf`).
 * `next` is absent when the new animation has no leaf for the key.
 */
export function relateToLiveLeaf(
  live: AnimationObject,
  next: AnimationObject | undefined
): LiveLeafRelation {
  'worklet';
  const isLiveTiming = live.type === 'timing';
  if (!next) {
    // A merged delay starts again; a merged timing keeps its start time.
    return isLiveTiming ? 'continues' : 'frameDriver';
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
  return hasSameTiming(live.__nativeTiming, next.__nativeTiming)
    ? 'continues'
    : 'frameDriver';
}
