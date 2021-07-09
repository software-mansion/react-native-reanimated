import { Easing, EasingFn, EasingFactoryFn } from '../Easing';
import { defineAnimation } from './util';
import {
  Animation,
  AnimationCallback,
  Timestamp,
  NumericAnimation,
} from './commonTypes';

interface TimingConfig {
  duration?: number;
  easing?: EasingFn | EasingFactoryFn;
}

export interface TimingAnimation
  extends Animation<TimingAnimation>,
    NumericAnimation {
  type: string;
  easing?: EasingFn;
  startValue?: number;
  startTime?: Timestamp;
  progress: number;
  toValue: number;
  current: number;
}

export function withTiming(
  toValue: number,
  userConfig?: TimingConfig,
  callback?: AnimationCallback
): Animation<TimingAnimation> {
  'worklet';

  return defineAnimation<TimingAnimation>(toValue, () => {
    'worklet';
    const config: Required<TimingConfig> = {
      duration: 300,
      easing: Easing.inOut(Easing.quad),
    };
    if (userConfig) {
      Object.keys(userConfig).forEach((key) => (config[key] = userConfig[key]));
    }

    function timing(animation: TimingAnimation, now: Timestamp): boolean {
      const { toValue, startTime, startValue } = animation;
      const runtime = now - startTime;

      if (runtime >= config.duration) {
        // reset startTime to avoid reusing finished animation config in `start` method
        animation.startTime = 0;
        animation.current = toValue;
        return true;
      }
      const progress = animation.easing(runtime / config.duration);
      animation.current = startValue + (toValue - startValue) * progress;
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
        animation.startValue = (previousAnimation as TimingAnimation).startValue;
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
      onStart,
      progress: 0,
      toValue,
      current: toValue,
      callback,
    };
  });
}
