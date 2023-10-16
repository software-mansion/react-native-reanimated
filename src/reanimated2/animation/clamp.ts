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
  delayedAnimation: T,
  reduceMotion?: ReduceMotion
) => T;

// TODO This feature is not documented yet
export const withClamp = function <T extends AnimationObject<number>>(
  config: { min?: number; max?: number; reduceMotion?: ReduceMotion },
  _nextAnimation: T | (() => T)
): Animation<ClampAnimation> {
  'worklet';
  return defineAnimation<ClampAnimation, T>(
    _nextAnimation,
    (): ClampAnimation => {
      'worklet';
      const nextAnimation =
        typeof _nextAnimation === 'function'
          ? _nextAnimation()
          : _nextAnimation;

      function delay(animation: ClampAnimation, now: Timestamp): boolean {
        const finished = nextAnimation.onFrame(nextAnimation, now);

        if (nextAnimation.current === undefined) {
          // This should never happen
          // TODO fix nextAnimation.current shouldn't be optional
        } else {
          const clampUpper = config.max ? config.max : nextAnimation.current;
          const clampLower = config.min ? config.min : nextAnimation.current;
          animation.current = Math.max(
            clampLower,
            Math.min(clampUpper, nextAnimation.current)
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
        if (nextAnimation.reduceMotion === undefined) {
          nextAnimation.reduceMotion = animation.reduceMotion;
        }

        nextAnimation.onStart(nextAnimation, value, now, previousAnimation!);
      }

      const callback = (finished?: boolean): void => {
        if (nextAnimation.callback) {
          nextAnimation.callback(finished);
        }
      };

      return {
        isHigherOrder: true,
        onFrame: delay,
        onStart,
        current: nextAnimation.current!,
        callback,
        previousAnimation: null,
        startTime: 0,
        started: false,
        reduceMotion: getReduceMotionForAnimation(config.reduceMotion),
      };
    }
  );
} as withClampType;
