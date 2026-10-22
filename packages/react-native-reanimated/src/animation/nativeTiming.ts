'use strict';
import { IS_IOS } from '../common';
import type {
  AnimatableValue,
  AnimationCallback,
  AnimationObject,
  EasingFunction,
  NativeTimingDescription,
  ReduceMotion,
} from '../commonTypes';
import type { EasingFunctionFactory } from '../Easing';
import { Easing } from '../Easing';
import { getStaticFeatureFlag } from '../featureFlags';
import { getReduceMotionFromConfig } from './utilCommon';

const DESCRIBES_NATIVE_TIMING: boolean =
  IS_IOS && getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION');

const LINEAR = Easing.linear;
const EASE = Easing.ease;
const EASE_CONTROL_POINTS: [number, number, number, number] = [0.42, 0, 1, 1];

/**
 * Has no result for an animation that native playback cannot repeat: a callback
 * on the animation, reduced motion, a target that is not a number or a string,
 * or an easing other than linear and cubic Bezier.
 */
export function describeNativeTiming(
  toValue: AnimatableValue,
  {
    duration,
    easing,
  }: {
    duration: number;
    easing: EasingFunction | EasingFunctionFactory;
  },
  callback: AnimationCallback | undefined,
  reduceMotion: ReduceMotion | undefined
): NativeTimingDescription | undefined {
  'worklet';
  if (
    !DESCRIBES_NATIVE_TIMING ||
    callback !== undefined ||
    (typeof toValue !== 'number' && typeof toValue !== 'string') ||
    getReduceMotionFromConfig(reduceMotion)
  ) {
    return undefined;
  }
  if (easing === LINEAR) {
    return { toValue, durationMs: duration, delaysMs: [] };
  }
  const cubicBezier =
    easing === EASE
      ? EASE_CONTROL_POINTS
      : (easing as EasingFunctionFactory).bezier;
  return (
    cubicBezier && {
      toValue,
      durationMs: duration,
      delaysMs: [],
      cubicBezier,
    }
  );
}

/**
 * A negative delay starts the animation at once, so each wrapper counts as no
 * less than zero.
 */
export function delayNativeTiming(
  delayMs: number,
  nextAnimation: AnimationObject,
  reduceMotion: ReduceMotion | undefined
): NativeTimingDescription | undefined {
  'worklet';
  const nativeTiming = nextAnimation.__nativeTiming;
  if (!nativeTiming || getReduceMotionFromConfig(reduceMotion)) {
    return undefined;
  }
  return {
    ...nativeTiming,
    delaysMs: [Math.max(0, delayMs), ...nativeTiming.delaysMs],
  };
}
