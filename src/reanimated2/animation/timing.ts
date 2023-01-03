import { Easing, EasingFn, EasingFactoryFn } from '../Easing';
import { defineAnimation } from './util';
import {
  Animation,
  AnimationCallback,
  Timestamp,
  AnimatableValue,
} from '../commonTypes';

interface TimingConfig {
  duration?: number;
  easing?: EasingFn | EasingFactoryFn;
}

export interface TimingAnimation<T extends AnimatableValue>
  extends Animation<TimingAnimation<T>> {
  type: string;
  easing: EasingFn;
  startValue: AnimatableValue;
  startTime: Timestamp;
  progress: number;
  toValue: AnimatableValue;
  current: T;
}

export interface InnerTimingAnimation<T extends AnimatableValue>
  extends Omit<TimingAnimation<T>, 'toValue' | 'current'> {
  toValue: number;
  current: number;
}

export function withTiming<T extends AnimatableValue>(
  toValue: T,
  userConfig?: TimingConfig,
  callback?: AnimationCallback
): Animation<TimingAnimation<T>> {
  'worklet';

  return defineAnimation<TimingAnimation<T>>(toValue, () => {
    'worklet';
    const config: Required<TimingConfig> = {
      duration: 300,
      easing: Easing.inOut(Easing.quad),
    };
    if (userConfig) {
      Object.keys(userConfig).forEach(
        (key) =>
          ((config as any)[key] = userConfig[key as keyof typeof userConfig])
      );
    }

    function timing(
      animation: InnerTimingAnimation<T>,
      now: Timestamp
    ): boolean {
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
      animation: TimingAnimation<T>,
      value: T,
      now: Timestamp,
      previousAnimation: Animation<TimingAnimation<T>>
    ): void {
      if (
        previousAnimation &&
        (previousAnimation as TimingAnimation<T>).type === 'timing' &&
        (previousAnimation as TimingAnimation<T>).toValue === toValue &&
        (previousAnimation as TimingAnimation<T>).startTime
      ) {
        // to maintain continuity of timing animations we check if we are starting
        // new timing over the old one with the same parameters. If so, we want
        // to copy animation timeline properties
        animation.startTime = (
          previousAnimation as TimingAnimation<T>
        ).startTime;
        animation.startValue = (
          previousAnimation as TimingAnimation<T>
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
      onStart: onStart as (
        animation: TimingAnimation<T>,
        now: number
      ) => boolean,
      progress: 0,
      toValue,
      startValue: 0,
      startTime: 0,
      easing: () => 0,
      current: toValue,
      callback,
    } as TimingAnimation<T>;
  });
}
