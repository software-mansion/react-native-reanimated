'use strict';
import { defineAnimation, getReduceMotionForAnimation } from './util';
import type {
  Animation,
  AnimationCallback,
  AnimatableValue,
  Timestamp,
} from '../commonTypes';
import type {
  SpringConfig,
  SpringAnimation,
  InnerSpringAnimation,
  SpringConfigInner,
  DefaultSpringConfig,
} from './springUtils';
import {
  initialCalculations,
  calculateNewMassToMatchDuration,
  underDampedSpringCalculations,
  criticallyDampedSpringCalculations,
  isAnimationTerminatingCalculation,
  checkIfConfigIsValid,
} from './springUtils';

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type withSpringType = <T extends AnimatableValue>(
  toValue: T,
  userConfig?: SpringConfig,
  callback?: AnimationCallback
) => T;

/**
 * Lets you create spring-based animations.
 *
 * @param toValue - the value at which the animation will come to rest - {@link AnimatableValue}
 * @param config - the spring animation configuration - {@link SpringConfig}
 * @param callback - a function called on animation complete - {@link AnimationCallback}
 * @returns an [animation object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object) which holds the current state of the animation
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring
 */
export const withSpring = ((
  toValue: AnimatableValue,
  userConfig?: SpringConfig,
  callback?: AnimationCallback
): Animation<SpringAnimation> => {
  'worklet';

  return defineAnimation<SpringAnimation>(toValue, () => {
    'worklet';
    const defaultConfig: DefaultSpringConfig = {
      damping: 10,
      mass: 1,
      stiffness: 100,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 2,
      velocity: 0,
      duration: 2000,
      dampingRatio: 0.5,
      reduceMotion: undefined,
    } as const;

    const config: DefaultSpringConfig & SpringConfigInner = {
      ...defaultConfig,
      ...userConfig,
      useDuration: !!(userConfig?.duration || userConfig?.dampingRatio),
      skipAnimation: false,
    };

    config.skipAnimation = !checkIfConfigIsValid(config);

    if (config.duration === 0) {
      config.skipAnimation = true;
    }

    function springOnFrame(
      animation: InnerSpringAnimation,
      now: Timestamp
    ): boolean {
      const { toValue, startTimestamp, current } = animation;

      const timeFromStart = now - startTimestamp;

      if (config.useDuration && timeFromStart >= config.duration) {
        animation.current = toValue;
        // clear lastTimestamp to avoid using stale value by the next spring animation that starts after this one
        animation.lastTimestamp = 0;
        return true;
      }

      if (config.skipAnimation) {
        animation.current = toValue;
        animation.lastTimestamp = 0;
        return true;
      }
      const { lastTimestamp, velocity } = animation;

      const deltaTime = Math.min(now - lastTimestamp, 64);
      animation.lastTimestamp = now;

      const t = deltaTime / 1000;
      const v0 = -velocity;
      const x0 = toValue - current;

      const { zeta, omega0, omega1 } = animation;

      const { position: newPosition, velocity: newVelocity } =
        zeta < 1
          ? underDampedSpringCalculations(animation, {
              zeta,
              v0,
              x0,
              omega0,
              omega1,
              t,
            })
          : criticallyDampedSpringCalculations(animation, {
              v0,
              x0,
              omega0,
              t,
            });

      animation.current = newPosition;
      animation.velocity = newVelocity;

      const { isOvershooting, isVelocity, isDisplacement } =
        isAnimationTerminatingCalculation(animation, config);

      const springIsNotInMove =
        isOvershooting || (isVelocity && isDisplacement);

      if (!config.useDuration && springIsNotInMove) {
        animation.velocity = 0;
        animation.current = toValue;
        // clear lastTimestamp to avoid using stale value by the next spring animation that starts after this one
        animation.lastTimestamp = 0;
        return true;
      }

      return false;
    }

    function isTriggeredTwice(
      previousAnimation: SpringAnimation | undefined,
      animation: SpringAnimation
    ) {
      return (
        previousAnimation?.lastTimestamp &&
        previousAnimation?.startTimestamp &&
        previousAnimation?.toValue === animation.toValue &&
        previousAnimation?.duration === animation.duration &&
        previousAnimation?.dampingRatio === animation.dampingRatio
      );
    }

    function onStart(
      animation: SpringAnimation,
      value: number,
      now: Timestamp,
      previousAnimation: SpringAnimation | undefined
    ): void {
      animation.current = value;
      animation.startValue = value;

      let mass = config.mass;
      const triggeredTwice = isTriggeredTwice(previousAnimation, animation);

      const duration = config.duration;

      const x0 = triggeredTwice
        ? // If animation is triggered twice we want to continue the previous animation
          // form the previous starting point
          previousAnimation?.startValue
        : Number(animation.toValue) - value;

      if (previousAnimation) {
        animation.velocity =
          (triggeredTwice
            ? previousAnimation?.velocity
            : previousAnimation?.velocity + config.velocity) || 0;
      } else {
        animation.velocity = config.velocity || 0;
      }

      if (triggeredTwice) {
        animation.zeta = previousAnimation?.zeta || 0;
        animation.omega0 = previousAnimation?.omega0 || 0;
        animation.omega1 = previousAnimation?.omega1 || 0;
      } else {
        if (config.useDuration) {
          const actualDuration = triggeredTwice
            ? // If animation is triggered twice we want to continue the previous animation
              // so we need to include the time that already elapsed
              duration -
              ((previousAnimation?.lastTimestamp || 0) -
                (previousAnimation?.startTimestamp || 0))
            : duration;

          config.duration = actualDuration;
          mass = calculateNewMassToMatchDuration(
            x0 as number,
            config,
            animation.velocity
          );
        }

        const { zeta, omega0, omega1 } = initialCalculations(mass, config);
        animation.zeta = zeta;
        animation.omega0 = omega0;
        animation.omega1 = omega1;
      }

      animation.lastTimestamp = previousAnimation?.lastTimestamp || now;

      animation.startTimestamp = triggeredTwice
        ? previousAnimation?.startTimestamp || now
        : now;
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
      reduceMotion: getReduceMotionForAnimation(config.reduceMotion),
    } as SpringAnimation;
  });
}) as withSpringType;
