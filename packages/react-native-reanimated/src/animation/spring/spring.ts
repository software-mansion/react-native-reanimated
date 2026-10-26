'use strict';
import type {
  AnimatableValue,
  Animation,
  AnimationCallback,
  Timestamp,
} from '../../commonTypes';
import { describeNativeSpring } from '../nativeTiming';
import { defineAnimation, getReduceMotionForAnimation } from '../util';
import type { SpringConfig } from './springConfigs';
import {
  GentleSpringConfig,
  GentleSpringConfigWithDuration,
} from './springConfigs';
import type {
  DefaultSpringConfig,
  InnerSpringAnimation,
  SpringAnimation,
  SpringConfigInner,
} from './springUtils';
import {
  checkIfConfigIsValid,
  initialEnergyOf,
  isAnimationTerminatingCalculation,
  LARGEST_SPRING_STEP_MS,
  safeMergeConfigs,
  springStartOf,
  springStateAt,
  velocityTowardTarget,
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
 * @param toValue - The value at which the animation will come to rest -
 *   {@link AnimatableValue}
 * @param config - The spring animation configuration - {@link SpringConfig}.
 *   Defaults to {@link GentleSpringConfig}. You can use other predefined spring
 *   configurations, such as {@link WigglySpringConfig},
 *   {@link SnappySpringConfig}, {@link Reanimated3DefaultSpringConfig} or
 *   create your own.
 * @param callback - A function called on animation complete -
 *   {@link AnimationCallback}
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation
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
      ...GentleSpringConfig,
      ...GentleSpringConfigWithDuration,
      overshootClamping: false,
      energyThreshold: 6e-9,
      velocity: 0,
      reduceMotion: undefined,
      clamp: undefined,
    } as const;

    const config: DefaultSpringConfig & SpringConfigInner = safeMergeConfigs<
      DefaultSpringConfig & SpringConfigInner
    >(
      {
        ...defaultConfig,
        useDuration: !!(userConfig?.duration || userConfig?.dampingRatio),
        skipAnimation: false,
      },
      userConfig
    );

    config.skipAnimation = !checkIfConfigIsValid(config);

    if (config.duration === 0) {
      config.skipAnimation = true;
    }

    function springOnFrame(
      animation: InnerSpringAnimation,
      now: Timestamp
    ): boolean {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const { toValue, current } = animation;

      if (config.skipAnimation) {
        animation.current = toValue;
        animation.lastTimestamp = 0;
        return true;
      }
      const { lastTimestamp, velocity } = animation;

      const deltaTime = Math.min(
        Math.max(now - lastTimestamp, 0),
        LARGEST_SPRING_STEP_MS
      );
      animation.lastTimestamp = now;

      const t = deltaTime / 1000;
      const v0 = velocity as number;
      const x0 = current - toValue;

      const { zeta, omega0, omega1 } = animation;

      const { displacement, velocity: newVelocity } = springStateAt(
        { zeta, omega0, omega1 },
        x0,
        v0,
        t
      );

      animation.current = toValue + displacement;
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

      const triggeredTwice = isTriggeredTwice(previousAnimation, animation);
      const toValueNum = Number(animation.toValue);

      const velocity = previousAnimation
        ? (triggeredTwice
            ? previousAnimation.velocity
            : previousAnimation.velocity + config.velocity) || 0
        : config.velocity || 0;

      if (triggeredTwice) {
        // If animation is triggered twice we want to continue the previous animation
        // form the previous starting point
        const x0 = previousAnimation?.startValue as number;
        animation.startValue = x0;
        animation.velocity = velocityTowardTarget(velocity, value - toValueNum);
        animation.zeta = previousAnimation?.zeta || 0;
        animation.omega0 = previousAnimation?.omega0 || 0;
        animation.omega1 = previousAnimation?.omega1 || 0;
        animation.initialEnergy = initialEnergyOf(x0, config.stiffness, config);
      } else {
        const { x0, v0, resolved, initialEnergy } = springStartOf(
          config,
          toValueNum,
          value,
          velocity
        );
        animation.startValue = x0;
        animation.velocity = v0;
        animation.zeta = resolved.zeta;
        animation.omega0 = resolved.omega0;
        animation.omega1 = resolved.omega1;
        config.stiffness = resolved.stiffness;
        animation.initialEnergy = initialEnergy;
      }

      animation.lastTimestamp = previousAnimation?.lastTimestamp || now;

      animation.startTimestamp = triggeredTwice
        ? previousAnimation?.startTimestamp || now
        : now;
    }

    const animation = {
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
      reduceMotion: getReduceMotionForAnimation(config.reduceMotion),
    } as SpringAnimation;
    const nativeTiming = describeNativeSpring(toValue, config, callback);
    if (nativeTiming) {
      animation.__nativeTiming = nativeTiming;
    }
    return animation;
  });
}) as withSpringType;
