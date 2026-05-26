'use strict';
import type {
  AnimatableValue,
  Animation,
  AnimationObject,
  ReduceMotion,
  Timestamp,
} from '../commonTypes';
import type { DelayAnimation } from './commonTypes';
import { defineAnimation, getReduceMotionForAnimation } from './util';

/**
 * An animation modifier that lets you start an animation with a delay.
 *
 * @param delayMs - Duration (in milliseconds) before the animation starts.
 * @param nextAnimation - The animation to delay.
 * @param reduceMotion - Determines how the animation responds to the device's
 *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
 *   {@link ReduceMotion}.
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withDelay
 */
export function withDelay<TValue extends AnimatableValue>(
  delayMs: number,
  _nextAnimation: AnimationObject<TValue> | (() => AnimationObject<TValue>),
  reduceMotion?: ReduceMotion
): Animation<DelayAnimation<TValue>> {
  'worklet';
  return defineAnimation<DelayAnimation<TValue>, AnimationObject<TValue>>(
    _nextAnimation,
    (): DelayAnimation<TValue> => {
      'worklet';
      const nextAnimation =
        typeof _nextAnimation === 'function'
          ? _nextAnimation()
          : _nextAnimation;

      function delay(
        animation: DelayAnimation<TValue>,
        now: Timestamp
      ): boolean {
        const { startTime, started, previousAnimation } = animation;
        const current = animation.current;
        if (now - startTime >= delayMs || animation.reduceMotion) {
          if (!started) {
            nextAnimation.onStart(
              nextAnimation,
              current,
              now,
              previousAnimation
            );
            animation.previousAnimation = null;
            animation.started = true;
          }
          const finished = nextAnimation.onFrame(nextAnimation, now);
          animation.current = nextAnimation.current!;
          return finished;
        } else if (previousAnimation) {
          const finished =
            previousAnimation.finished ||
            previousAnimation.onFrame(previousAnimation, now);
          animation.current = previousAnimation.current;
          if (finished) {
            animation.previousAnimation = null;
          }
        }
        return false;
      }

      function onStart(
        animation: DelayAnimation<TValue>,
        value: TValue,
        now: Timestamp,
        previousAnimation: AnimationObject | null
      ): void {
        animation.startTime = now;
        animation.started = false;
        animation.current = value;
        if (previousAnimation === animation) {
          animation.previousAnimation = previousAnimation.previousAnimation;
        } else {
          animation.previousAnimation =
            previousAnimation as DelayAnimation<TValue> | null;
        }

        // child animations inherit the setting, unless they already have it defined
        // they will have it defined only if the user used the `reduceMotion` prop
        if (nextAnimation.reduceMotion === undefined) {
          nextAnimation.reduceMotion = animation.reduceMotion;
        }
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
}
