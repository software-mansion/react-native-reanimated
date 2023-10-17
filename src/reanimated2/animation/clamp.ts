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
  config: { min?: number; max?: number; reduceMotion?: ReduceMotion },
  clampedAnimation: T
) => T;

// TODO This feature is not documented yet
export const withClamp = function <T extends AnimationObject<number>>(
  config: { min?: number; max?: number; reduceMotion?: ReduceMotion },
  _clampedAnimation: T | (() => T)
): Animation<ClampAnimation> {
  'worklet';
  return defineAnimation<ClampAnimation, T>(
    _clampedAnimation,
    (): ClampAnimation => {
      'worklet';
      const clampedAnimation =
        typeof _clampedAnimation === 'function'
          ? _clampedAnimation()
          : _clampedAnimation;

      function clampOnFrame(
        animation: ClampAnimation,
        now: Timestamp
      ): boolean {
        const finished = clampedAnimation.onFrame(clampedAnimation, now);

        if (clampedAnimation.current === undefined) {
          // This should never happen
          // TODO check if nextAnimation.current should be optional
          console.warn(
            "[Reanimated] Error inside 'withClamp' animation, the inner animation has invalid current value"
          );
          return true;
        } else {
          const clampUpper = config.max ? config.max : clampedAnimation.current;
          const clampLower = config.min ? config.min : clampedAnimation.current;
          animation.current = Math.max(
            clampLower,
            Math.min(clampUpper, clampedAnimation.current)
          );
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
        if (clampedAnimation.reduceMotion === undefined) {
          clampedAnimation.reduceMotion = animation.reduceMotion;
        }

        clampedAnimation.onStart(
          clampedAnimation,
          value,
          now,
          previousAnimation!
        );
      }

      const callback = (finished?: boolean): void => {
        if (clampedAnimation.callback) {
          clampedAnimation.callback(finished);
        }
      };

      return {
        isHigherOrder: true,
        onFrame: clampOnFrame,
        onStart,
        current: clampedAnimation.current!,
        callback,
        previousAnimation: null,
        reduceMotion: getReduceMotionForAnimation(config.reduceMotion),
      };
    }
  );
} as withClampType;
