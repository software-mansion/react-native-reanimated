'use strict';

import { defineAnimation, getReduceMotionForAnimation } from "../util.js";
import { GentleSpringConfig, GentleSpringConfigWithDuration } from "./springConfigs.js";
import { calculateNewStiffnessToMatchDuration, checkIfConfigIsValid, criticallyDampedSpringCalculations, getEnergy, initialCalculations, isAnimationTerminatingCalculation, scaleZetaToMatchClamps, underDampedSpringCalculations } from "./springUtils.js";

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.

/**
 * Lets you create spring-based animations.
 *
 * @param toValue - The value at which the animation will come to rest -
 *   {@link AnimatableValue}
 * @param config - The spring animation configuration - {@link SpringConfig}.
 *   Defaults to {@link GentleSpringConfig}. You can use other predefined spring
 *   configurations, such as {@link WigglySpringConfig},
 *   {@link SnappySpringConfig}, {@link Reanimated3DefaultSpringConfig} or create
 *   your own.
 * @param callback - A function called on animation complete -
 *   {@link AnimationCallback}
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring
 */
export const withSpring = (toValue, userConfig, callback) => {
  'worklet';

  return defineAnimation(toValue, () => {
    'worklet';

    const defaultConfig = {
      ...GentleSpringConfig,
      ...GentleSpringConfigWithDuration,
      overshootClamping: false,
      energyThreshold: 6e-9,
      velocity: 0,
      reduceMotion: undefined,
      clamp: undefined
    };
    const config = {
      ...defaultConfig,
      ...userConfig,
      useDuration: !!(userConfig?.duration || userConfig?.dampingRatio),
      skipAnimation: false
    };
    config.skipAnimation = !checkIfConfigIsValid(config);
    if (config.duration === 0) {
      config.skipAnimation = true;
    }
    function springOnFrame(animation, now) {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const {
        toValue,
        current
      } = animation;
      if (config.skipAnimation) {
        animation.current = toValue;
        animation.lastTimestamp = 0;
        return true;
      }
      const {
        lastTimestamp,
        velocity
      } = animation;
      const deltaTime = Math.min(now - lastTimestamp, 64);
      animation.lastTimestamp = now;
      const t = deltaTime / 1000;
      const v0 = velocity;
      const x0 = current - toValue;
      const {
        zeta,
        omega0,
        omega1
      } = animation;
      const {
        position: newPosition,
        velocity: newVelocity
      } = zeta < 1 ? underDampedSpringCalculations(animation, {
        zeta,
        v0,
        x0,
        omega0,
        omega1,
        t
      }) : criticallyDampedSpringCalculations(animation, {
        v0,
        x0,
        omega0,
        t
      });
      animation.current = newPosition;
      animation.velocity = newVelocity;
      if (isAnimationTerminatingCalculation(animation, config)) {
        animation.velocity = 0;
        animation.current = toValue;
        // clear lastTimestamp to avoid using stale value by the next spring animation that starts after this one
        animation.lastTimestamp = 0;
        return true;
      }
      return false;
    }
    function isTriggeredTwice(previousAnimation, animation) {
      return previousAnimation?.lastTimestamp && previousAnimation?.startTimestamp && previousAnimation?.toValue === animation.toValue && previousAnimation?.duration === animation.duration && previousAnimation?.dampingRatio === animation.dampingRatio;
    }
    function onStart(animation, value, now, previousAnimation) {
      animation.current = value;
      let stiffness = config.stiffness;
      const triggeredTwice = isTriggeredTwice(previousAnimation, animation);
      const duration = config.duration;
      const x0 = triggeredTwice ?
      // If animation is triggered twice we want to continue the previous animation
      // form the previous starting point
      previousAnimation?.startValue : value - animation.toValue;
      animation.startValue = x0;
      if (previousAnimation) {
        animation.velocity = (triggeredTwice ? previousAnimation?.velocity : previousAnimation?.velocity + config.velocity) || 0;
      } else {
        animation.velocity = config.velocity || 0;
      }
      if (triggeredTwice) {
        animation.zeta = previousAnimation?.zeta || 0;
        animation.omega0 = previousAnimation?.omega0 || 0;
        animation.omega1 = previousAnimation?.omega1 || 0;
      } else {
        if (config.useDuration) {
          const actualDuration = triggeredTwice ?
          // If animation is triggered twice we want to continue the previous animation
          // so we need to include the time that already elapsed
          duration - ((previousAnimation?.lastTimestamp || 0) - (previousAnimation?.startTimestamp || 0)) : duration;
          config.duration = actualDuration;
          stiffness = calculateNewStiffnessToMatchDuration(x0, config, animation.velocity);
          config.stiffness = stiffness;
        }
        const {
          zeta,
          omega0,
          omega1
        } = initialCalculations(stiffness, config);
        animation.zeta = zeta;
        animation.omega0 = omega0;
        animation.omega1 = omega1;
        if (config.clamp !== undefined) {
          animation.zeta = scaleZetaToMatchClamps(animation, config.clamp);
        }
      }
      const initialEnergy = getEnergy(x0, config.velocity, config.stiffness, config.mass);
      animation.initialEnergy = initialEnergy;
      animation.lastTimestamp = previousAnimation?.lastTimestamp || now;
      animation.startTimestamp = triggeredTwice ? previousAnimation?.startTimestamp || now : now;
    }
    return {
      onFrame: springOnFrame,
      onStart,
      toValue,
      velocity: config.velocity || 0,
      current: toValue,
      startValue: 0,
      callback,
      lastTimestamp: 0,
      startTimestamp: 0,
      zeta: 0,
      omega0: 0,
      omega1: 0,
      initialEnergy: 0,
      reduceMotion: getReduceMotionForAnimation(config.reduceMotion)
    };
  });
};
//# sourceMappingURL=spring.js.map