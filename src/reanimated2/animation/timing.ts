import { Easing, EasingFn, EasingFactoryFn } from '../Easing';
import { defineAnimation } from "./animations";
import { Animation, AnimationCallback } from './commonTypes';

interface TimingConfig  {
  duration?: number,
  easing?: EasingFn | EasingFactoryFn,
}

export function withTiming(toValue: number | string, userConfig?: TimingConfig, callback?: AnimationCallback): Animation {
  'worklet';

  return defineAnimation(toValue, () => {
    'worklet';
    const config = {
      duration: 300,
      easing: Easing.inOut(Easing.quad),
    };
    if (userConfig) {
      Object.keys(userConfig).forEach((key) => (config[key] = userConfig[key]));
    }

    function timing(animation, now) {
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

    function onStart(animation, value, now, previousAnimation) {
      if (
        previousAnimation &&
        previousAnimation.type === 'timing' &&
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
      onFrame: timing,
      onStart,
      progress: 0,
      toValue,
      current: toValue,
      callback,
    };
  });
}
