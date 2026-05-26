'use strict';
import type {
  AnimatableValue,
  Animation,
  AnimationCallback,
  AnimationObject,
  EasingFunction,
  ReduceMotion,
  Timestamp,
} from '../commonTypes';
import type { EasingFunctionFactory } from '../Easing';
import { Easing } from '../Easing';
import {
  assertEasingIsWorklet,
  defineAnimation,
  getReduceMotionForAnimation,
} from './util';

/**
 * The timing animation configuration.
 *
 * @param duration - Length of the animation (in milliseconds). Defaults to 300.
 * @param easing - An easing function which defines the animation curve.
 *   Defaults to `Easing.inOut(Easing.quad)`.
 * @param reduceMotion - Determines how the animation responds to the device's
 *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
 *   {@link ReduceMotion}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming#config-
 */
interface TimingConfig {
  duration?: number;
  reduceMotion?: ReduceMotion;
  easing?: EasingFunction | EasingFunctionFactory;
}

export type WithTimingConfig = TimingConfig;

export interface TimingAnimation<
  TValue extends AnimatableValue = AnimatableValue,
> extends Animation<TimingAnimation<TValue>> {
  type: string;
  easing: EasingFunction;
  startValue: TValue;
  startTime: Timestamp;
  progress: number;
  toValue: TValue;
  current: TValue;
}

interface InnerTimingAnimation extends Omit<
  TimingAnimation,
  'toValue' | 'current'
> {
  toValue: number;
  current: number;
}

/**
 * Lets you create an animation based on duration and easing.
 *
 * @param toValue - The value on which the animation will come at rest -
 *   {@link AnimatableValue}.
 * @param config - The timing animation configuration - {@link TimingConfig}.
 *   Defaults to {@link TimingConfig} default values.
 * @param callback - A function called on animation complete -
 *   {@link AnimationCallback}.
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming
 */
export function withTiming<TValue extends AnimatableValue>(
  toValue: TValue,
  userConfig?: TimingConfig,
  callback?: AnimationCallback
): Animation<TimingAnimation<TValue>> {
  'worklet';

  if (__DEV__ && userConfig?.easing) {
    assertEasingIsWorklet(userConfig.easing);
  }

  return defineAnimation<TimingAnimation<TValue>>(toValue, () => {
    'worklet';
    const config: Required<Omit<TimingConfig, 'reduceMotion'>> = {
      duration: userConfig?.duration ?? 300,
      easing: userConfig?.easing ?? Easing.inOut(Easing.quad),
    };

    function timing(animation: InnerTimingAnimation, now: Timestamp): boolean {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const { toValue, startTime, startValue } = animation;
      const runtime = now - startTime;

      if (runtime >= config.duration) {
        // reset startTime to avoid reusing finished animation config in `start` method
        animation.startTime = 0;
        animation.current = toValue;
        return true;
      }
      const progress = animation.easing(runtime / config.duration);
      animation.current =
        (startValue as number) + (toValue - (startValue as number)) * progress;
      return false;
    }

    function onStart(
      animation: TimingAnimation<TValue>,
      value: TValue,
      now: Timestamp,
      previousAnimation: AnimationObject | null
    ): void {
      if (
        previousAnimation?.type === 'timing' &&
        previousAnimation.toValue === toValue &&
        previousAnimation.startTime
      ) {
        // to maintain continuity of timing animations we check if we are starting
        // new timing over the old one with the same parameters. If so, we want
        // to copy animation timeline properties
        animation.startTime = previousAnimation.startTime;
        animation.startValue = previousAnimation.startValue;
      } else {
        animation.startTime = now;
        animation.startValue = value;
      }
      animation.current = value;
      if (typeof config.easing === 'object') {
        animation.easing = config.easing.factory();
      } else {
        animation.easing = config.easing;
      }
    }

    return {
      type: 'timing',
      // `onFrame` operates on the *inner* numeric representation set up by the
      // animation framework — typed here to satisfy the public
      // `TimingAnimation<TValue>` contract.
      onFrame: timing as TimingAnimation<TValue>['onFrame'],
      onStart,
      progress: 0,
      toValue,
      startValue: toValue,
      startTime: 0,
      easing: () => 0,
      current: toValue,
      callback,
      reduceMotion: getReduceMotionForAnimation(userConfig?.reduceMotion),
    };
  });
}
