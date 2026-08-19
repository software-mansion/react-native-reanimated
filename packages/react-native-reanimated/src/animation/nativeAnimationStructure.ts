'use strict';
import { IS_IOS } from '../common';
import type {
  AnimatableValue,
  AnimationCallback,
  AnimationObject,
  EasingFunction,
  NativeAnimationNode,
  NativeAnimationTimingStructure,
  ReduceMotion,
} from '../commonTypes';
import type { EasingFunctionFactory } from '../Easing';
import { Easing } from '../Easing';
import { getStaticFeatureFlag } from '../featureFlags';
import { getReduceMotionFromConfig } from './utilCommon';

/**
 * Animation factories attach stable native structure only on iOS behind the
 * native layout-animation flag. With the flag off the factories create exactly
 * the same objects as before.
 */
export const SHOULD_ATTACH_NATIVE_ANIMATION_STRUCTURE: boolean =
  IS_IOS && getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION');

type MarkedEasing = {
  __nativeTiming?: NativeAnimationTimingStructure;
};

// Library easing functions keep one instance across worklet serialization, so
// reference identity recognizes them on every runtime. Factory easings carry
// their timing data as a plain object property, which serialization preserves.
const LINEAR_EASING = Easing.linear;
const EASE_EASING = Easing.ease;

function timingStructureFromEasing(
  easing: EasingFunction | EasingFunctionFactory
): NativeAnimationTimingStructure {
  'worklet';
  if (easing === LINEAR_EASING) {
    return { kind: 'linear' };
  }
  if (easing === EASE_EASING) {
    return { kind: 'cubicBezier', x1: 0.42, y1: 0, x2: 1, y2: 1 };
  }
  const marker = (easing as MarkedEasing).__nativeTiming;
  if (marker && marker.kind === 'cubicBezier') {
    return marker;
  }
  return { kind: 'opaque' };
}

/**
 * Builds the stable structure for one timing animation. Returns nothing when
 * the animation cannot use it: a per-track callback needs frame-driven events,
 * a reduced-motion skip keeps its frame-driven rules until Objective 11, and a
 * non-numeric target value has no common form yet.
 */
export function nativeTimingStructure(
  toValue: AnimatableValue,
  durationMs: number,
  easing: EasingFunction | EasingFunctionFactory,
  callback?: AnimationCallback,
  reduceMotion?: ReduceMotion
): NativeAnimationNode | undefined {
  'worklet';
  if (
    !SHOULD_ATTACH_NATIVE_ANIMATION_STRUCTURE ||
    callback !== undefined ||
    typeof toValue !== 'number' ||
    getReduceMotionFromConfig(reduceMotion)
  ) {
    return undefined;
  }
  return {
    kind: 'timing',
    toValue,
    durationMs,
    easing: timingStructureFromEasing(easing),
  };
}

/**
 * Wraps a child structure in a delay node. A child without structure or a
 * reduced-motion skip keeps the animation frame-driven.
 */
export function nativeDelayStructure(
  delayMs: number,
  nextAnimation: AnimationObject,
  reduceMotion?: ReduceMotion
): NativeAnimationNode | undefined {
  'worklet';
  const child = nextAnimation.__nativeAnimation;
  if (
    !SHOULD_ATTACH_NATIVE_ANIMATION_STRUCTURE ||
    child === undefined ||
    getReduceMotionFromConfig(reduceMotion)
  ) {
    return undefined;
  }
  return { kind: 'delay', delayMs, node: child };
}
