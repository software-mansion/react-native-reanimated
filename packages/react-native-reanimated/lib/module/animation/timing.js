'use strict';

import { Easing } from "../Easing.js";
import { assertEasingIsWorklet, defineAnimation, getReduceMotionForAnimation } from "./util.js";

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

// TODO TYPESCRIPT This is temporary type put in here to get rid of our .d.ts file

/**
 * Lets you create an animation based on duration and easing.
 *
 * @param toValue - The value on which the animation will come at rest -
 *   {@link AnimatableValue}.
 * @param config - The timing animation configuration - {@link TimingConfig}.
 * @param callback - A function called on animation complete -
 *   {@link AnimationCallback}.
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming
 */
export const withTiming = function (toValue, userConfig, callback) {
  'worklet';

  if (__DEV__ && userConfig?.easing) {
    assertEasingIsWorklet(userConfig.easing);
  }
  return defineAnimation(toValue, () => {
    'worklet';

    const config = {
      duration: 300,
      easing: Easing.inOut(Easing.quad)
    };
    if (userConfig) {
      Object.keys(userConfig).forEach(key => config[key] = userConfig[key]);
    }
    function timing(animation, now) {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const {
        toValue,
        startTime,
        startValue
      } = animation;
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
      if (previousAnimation && previousAnimation.type === 'timing' && previousAnimation.toValue === toValue && previousAnimation.startTime) {
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
      onStart: onStart,
      progress: 0,
      toValue,
      startValue: 0,
      startTime: 0,
      easing: () => 0,
      current: toValue,
      callback,
      reduceMotion: getReduceMotionForAnimation(userConfig?.reduceMotion)
    };
  });
};
//# sourceMappingURL=timing.js.map