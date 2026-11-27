'use strict';
import { IS_ANDROID, IS_IOS } from '../common';
import type {
  AnimatableValue,
  AnimationCallback,
  AnimationObject,
  EasingFunction,
  NativeEasing,
  NativeTimingDescription,
  ReduceMotion,
} from '../commonTypes';
import type { EasingFunctionFactory } from '../Easing';
import { Easing } from '../Easing';
import { getStaticFeatureFlag } from '../featureFlags';
import type {
  DefaultSpringConfig,
  SpringConfigInner,
} from './spring/springUtils';
import { getReduceMotionFromConfig } from './utilCommon';

const DESCRIBES_NATIVE_TIMING: boolean = IS_IOS
  ? getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION')
  : IS_ANDROID && getStaticFeatureFlag('ANDROID_NATIVE_LAYOUT_ANIMATIONS');

const LINEAR = Easing.linear;
const EASE = Easing.ease;
const EASE_CONTROL_POINTS: [number, number, number, number] = [0.42, 0, 1, 1];

function describeEasing(
  easing: EasingFunction | EasingFunctionFactory
): NativeEasing {
  'worklet';
  if (easing === LINEAR) {
    return { kind: 'linear' };
  }
  if (easing === EASE) {
    return { kind: 'cubicBezier', controlPoints: EASE_CONTROL_POINTS };
  }
  if (typeof easing === 'function') {
    return { kind: 'function', easing };
  }
  return easing.bezier
    ? { kind: 'cubicBezier', controlPoints: easing.bezier }
    : { kind: 'function', easing: easing.factory() };
}

/**
 * Has no result for an animation that native playback cannot repeat: a callback
 * on the animation, reduced motion, or a target that is not a number or a
 * string.
 */
function nativeTargetOf(
  toValue: AnimatableValue,
  callback: AnimationCallback | undefined,
  reduceMotion: ReduceMotion | undefined
): number | string | undefined {
  'worklet';
  const isPlayable =
    DESCRIBES_NATIVE_TIMING &&
    callback === undefined &&
    !getReduceMotionFromConfig(reduceMotion);
  return isPlayable &&
    (typeof toValue === 'number' || typeof toValue === 'string')
    ? toValue
    : undefined;
}

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
  const target = nativeTargetOf(toValue, callback, reduceMotion);
  if (target === undefined) {
    return undefined;
  }
  return {
    phases: [
      {
        kind: 'timing',
        durationMs: duration,
        toValue: target,
        easing: describeEasing(easing),
      },
    ],
  };
}

export function describeNativeSpring(
  toValue: AnimatableValue,
  config: DefaultSpringConfig & SpringConfigInner,
  callback: AnimationCallback | undefined
): NativeTimingDescription | undefined {
  'worklet';
  const target = nativeTargetOf(toValue, callback, config.reduceMotion);
  if (target === undefined) {
    return undefined;
  }
  const { clamp } = config;
  return {
    phases: [
      {
        kind: 'spring',
        toValue: target,
        config: {
          mass: config.mass,
          stiffness: config.stiffness,
          damping: config.damping,
          duration: config.duration,
          dampingRatio: config.dampingRatio,
          overshootClamping: config.overshootClamping,
          energyThreshold: config.energyThreshold,
          velocity: config.velocity,
          clamp: clamp && { ...clamp },
          useDuration: config.useDuration,
          skipAnimation: config.skipAnimation,
        },
      },
    ],
  };
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
    phases: [
      { kind: 'hold', durationMs: Math.max(0, delayMs) },
      ...nativeTiming.phases,
    ],
  };
}

/**
 * The phases of the parts of a sequence in their order. Has no result when a
 * part has no description or has a spring, or for reduced motion on the
 * sequence. A sequence that starts with a hold has no result: the frame driver
 * runs the last part of the sequence during that hold.
 */
export function joinNativeTimings(
  animations: AnimationObject[],
  reduceMotion: ReduceMotion | undefined
): NativeTimingDescription | undefined {
  'worklet';
  if (getReduceMotionFromConfig(reduceMotion)) {
    return undefined;
  }
  const phases: NativeTimingDescription['phases'] = [];
  for (const { __nativeTiming } of animations) {
    if (!__nativeTiming) {
      return undefined;
    }
    phases.push(...__nativeTiming.phases);
  }
  if (phases.some(({ kind }) => kind === 'spring')) {
    return undefined;
  }
  return phases[0].kind === 'hold' ? undefined : { phases };
}
