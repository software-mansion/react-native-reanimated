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

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type withClampType = <T extends AnimatableValue>(
  clamp: { min: number; max: number },
  delayedAnimation: T,
  reduceMotion?: ReduceMotion
) => T;

export const withClamp = function <T extends AnimationObject>(
  clamp: { min: number; max: number },
  _nextAnimation: T | (() => T),
  reduceMotion?: ReduceMotion
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
        switch (typeof nextAnimation.current) {
          case 'number':
            animation.current = Math.max(
              clamp.min,
              Math.min(clamp.max, nextAnimation.current)
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
        reduceMotion: getReduceMotionForAnimation(reduceMotion),
      };
    }
  );
} as withClampType;
