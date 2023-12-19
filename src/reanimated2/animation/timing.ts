'use strict';
import type { EasingFunction, EasingFunctionFactory } from '../Easing';
import { Easing } from '../Easing';
import { defineAnimation, getReduceMotionForAnimation } from './util';
import type {
  Animation,
  AnimationCallback,
  Timestamp,
  AnimatableValue,
  ReduceMotion,
} from '../commonTypes';

/**
 * The timing animation configuration.
 *
 * @param duration - Length of the animation (in milliseconds). Defaults to 300.
 * @param easing - An easing function which defines the animation curve. Defaults to `Easing.inOut(Easing.quad)`.
 * @param reduceMotion - Determines how the animation responds to the device's reduced motion accessibility setting. Default to `ReduceMotion.System` - {@link ReduceMotion}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming#config-
 */
interface TimingConfig {
  duration?: number;
  reduceMotion?: ReduceMotion;
  easing?: EasingFunction | EasingFunctionFactory;
}

export type WithTimingConfig = TimingConfig;

export interface TimingAnimation extends Animation<TimingAnimation> {
  type: string;
  easing: EasingFunction;
  startValue: AnimatableValue;
  startTime: Timestamp;
  progress: number;
  toValue: AnimatableValue;
  current: AnimatableValue;
}

interface InnerTimingAnimation
  extends Omit<TimingAnimation, 'toValue' | 'current'> {
  toValue: number;
  current: number;
}

// TODO TYPESCRIPT This is temporary type put in here to get rid of our .d.ts file
type withTimingType = <T extends AnimatableValue>(
  toValue: T,
  userConfig?: TimingConfig,
  callback?: AnimationCallback
) => T;

/**
 * Lets you create an animation based on duration and easing.
 *
 * @param toValue - The value on which the animation will come at rest - {@link AnimatableValue}.
 * @param config - The timing animation configuration - {@link TimingConfig}.
 * @param callback - A function called on animation complete - {@link AnimationCallback}.
 * @returns An [animation object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object) which holds the current state of the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming
 */
export const withTiming = function (
  toValue: AnimatableValue,
  userConfig?: TimingConfig,
  callback?: AnimationCallback
): Animation<TimingAnimation> {
  'worklet';

  return defineAnimation<TimingAnimation>(toValue, () => {
    'worklet';
    const config: Required<Omit<TimingConfig, 'reduceMotion'>> = {
      duration: 300,
      easing: Easing.inOut(Easing.quad),
    };
    if (userConfig) {
      Object.keys(userConfig).forEach(
        (key) =>
          ((config as any)[key] = userConfig[key as keyof typeof userConfig])
      );
    }

    function timing(animation: InnerTimingAnimation, now: Timestamp): boolean {
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
      animation: TimingAnimation,
      value: number,
      now: Timestamp,
      previousAnimation: Animation<TimingAnimation>
    ): void {
      if (
        previousAnimation &&
        (previousAnimation as TimingAnimation).type === 'timing' &&
        (previousAnimation as TimingAnimation).toValue === toValue &&
        (previousAnimation as TimingAnimation).startTime
      ) {
        // to maintain continuity of timing animations we check if we are starting
        // new timing over the old one with the same parameters. If so, we want
        // to copy animation timeline properties
        animation.startTime = (previousAnimation as TimingAnimation).startTime;
        animation.startValue = (
          previousAnimation as TimingAnimation
        ).startValue;
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
      onFrame: timing,
      onStart: onStart as (animation: TimingAnimation, now: number) => boolean,
      progress: 0,
      toValue,
      startValue: 0,
      startTime: 0,
      easing: () => 0,
      current: toValue,
      callback,
      reduceMotion: getReduceMotionForAnimation(userConfig?.reduceMotion),
    } as TimingAnimation;
  });
} as withTimingType;
