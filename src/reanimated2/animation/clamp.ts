'use strict';
import { defineAnimation, getReduceMotionForAnimation } from './util';
import type {
  Animation,
  Timestamp,
  AnimatableValue,
  AnimationObject,
  ReduceMotion,
} from '../commonTypes';
import type { ClampAnimation } from './commonTypes';

type withClampType = <T extends AnimatableValue>(
  config: {
    min?: number | string;
    max?: number | string;
    reduceMotion?: ReduceMotion;
  },
  clampedAnimation: T
) => T;

export const withClamp = function <T extends AnimationObject<number>>(
  config: { min?: number; max?: number; reduceMotion?: ReduceMotion },
  _animationToClamp: T | (() => T)
): Animation<ClampAnimation> {
  'worklet';
  return defineAnimation<ClampAnimation, T>(
    _animationToClamp,
    (): ClampAnimation => {
      'worklet';
      const animationToClamp =
        typeof _animationToClamp === 'function'
          ? _animationToClamp()
          : _animationToClamp;

      function clampOnFrame(
        animation: ClampAnimation,
        now: Timestamp
      ): boolean {
        const finished = animationToClamp.onFrame(animationToClamp, now);

        if (animationToClamp.current === undefined) {
          console.warn(
            "[Reanimated] Error inside 'withClamp' animation, the inner animation has invalid current value"
          );
          return true;
        } else {
          if (
            config.max !== undefined &&
            config.max < animationToClamp.current
          ) {
            animation.current = config.max;
          } else if (
            config.min !== undefined &&
            config.min > animationToClamp.current
          ) {
            animation.current = config.min;
          } else {
            animation.current = animationToClamp.current;
          }
        }
        return finished;
      }

      function onStart(
        animation: Animation<any>,
        value: AnimatableValue,
        now: Timestamp,
        previousAnimation: Animation<any> | null
      ): void {
        animation.startTime = now;
        animation.started = false;
        animation.current = value;
        if (previousAnimation === animation) {
          animation.previousAnimation = previousAnimation.previousAnimation;
        } else {
          animation.previousAnimation = previousAnimation;
        }

        // child animations inherit the setting, unless they already have it defined
        // they will have it defined only if the user used the `reduceMotion` prop
        if (animationToClamp.reduceMotion === undefined) {
          animationToClamp.reduceMotion = animation.reduceMotion;
        }

        animationToClamp.onStart(
          animationToClamp,
          value,
          now,
          previousAnimation
        );
      }

      const callback = (finished?: boolean): void => {
        if (animationToClamp.callback) {
          animationToClamp.callback(finished);
        }
      };

      return {
        isHigherOrder: true,
        onFrame: clampOnFrame,
        onStart,
        current: animationToClamp.current!,
        callback,
        previousAnimation: null,
        reduceMotion: getReduceMotionForAnimation(config.reduceMotion),
      };
    }
  );
} as withClampType;
