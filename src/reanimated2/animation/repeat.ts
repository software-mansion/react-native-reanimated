import { defineAnimation } from './util';
import type {
  Animation,
  AnimationCallback,
  AnimatableValue,
  Timestamp,
  AnimationObject,
} from '../commonTypes';
import type { RepeatAnimation } from './commonTypes';

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type withRepeatType = <T extends AnimatableValue>(
  animation: T,
  numberOfReps?: number,
  reverse?: boolean,
  callback?: AnimationCallback
) => T;

export const withRepeat = function <T extends AnimationObject>(
  _nextAnimation: T | (() => T),
  numberOfReps = 2,
  reverse = false,
  callback?: AnimationCallback
): Animation<RepeatAnimation> {
  'worklet';

  return defineAnimation<RepeatAnimation, T>(
    _nextAnimation,
    (): RepeatAnimation => {
      'worklet';

      const nextAnimation =
        typeof _nextAnimation === 'function'
          ? _nextAnimation()
          : _nextAnimation;

      function repeat(animation: RepeatAnimation, now: Timestamp): boolean {
        const finished = nextAnimation.onFrame(nextAnimation, now);
        animation.current = nextAnimation.current;
        if (finished) {
          animation.reps += 1;
          // call inner animation's callback on every repetition
          // as the second argument the animation's current value is passed
          if (nextAnimation.callback) {
            nextAnimation.callback(true /* finished */, animation.current);
          }
          if (numberOfReps > 0 && animation.reps >= numberOfReps) {
            return true;
          }

          const startValue = reverse
            ? (nextAnimation.current as number)
            : animation.startValue;
          if (reverse) {
            nextAnimation.toValue = animation.startValue;
            animation.startValue = startValue;
          }
          nextAnimation.onStart(
            nextAnimation,
            startValue,
            now,
            nextAnimation.previousAnimation as RepeatAnimation
          );
          return false;
        }
        return false;
      }

      const repCallback = (finished?: boolean): void => {
        if (callback) {
          callback(finished);
        }
        // when cancelled call inner animation's callback
        if (!finished && nextAnimation.callback) {
          nextAnimation.callback(false /* finished */);
        }
      };

      function onStart(
        animation: RepeatAnimation,
        value: AnimatableValue,
        now: Timestamp,
        previousAnimation: Animation<any> | null
      ): void {
        animation.startValue = value;
        animation.reps = 0;
        nextAnimation.onStart(nextAnimation, value, now, previousAnimation);
      }

      return {
        isHigherOrder: true,
        onFrame: repeat,
        onStart,
        reps: 0,
        current: nextAnimation.current,
        callback: repCallback,
        startValue: 0,
      };
    }
  );
} as withRepeatType;
