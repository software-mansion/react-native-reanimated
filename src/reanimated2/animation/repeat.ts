import { defineAnimation } from './util';
import { Animation, AnimationCallback, NextAnimation } from './commonTypes';

export function withRepeat(
  _nextAnimation: NextAnimation,
  numberOfReps = 2,
  reverse = false,
  callback: AnimationCallback
): Animation {
  'worklet';

  return defineAnimation(_nextAnimation, () => {
    'worklet';

    const nextAnimation: Animation =
      typeof _nextAnimation === 'function' ? _nextAnimation() : _nextAnimation;

    function repeat(animation, now) {
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
          ? nextAnimation.current
          : animation.startValue;
        if (reverse) {
          nextAnimation.toValue = animation.startValue;
          animation.startValue = startValue;
        }
        nextAnimation.onStart(
          nextAnimation,
          startValue,
          now,
          nextAnimation.previousAnimation
        );
        return false;
      }
      return false;
    }

    const repCallback = (finished: boolean) => {
      if (callback) {
        callback(finished);
      }
      // when cancelled call inner animation's callback
      if (!finished && nextAnimation.callback) {
        nextAnimation.callback(false /* finished */);
      }
    };

    function onStart(animation, value, now, previousAnimation) {
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
    };
  });
}

/* Deprecated section, kept for backward compatibility. Will be removed soon */
export function repeat(
  _nextAnimation: NextAnimation,
  numberOfReps = 2,
  reverse = false,
  callback?: AnimationCallback
): Animation {
  'worklet';
  console.warn(
    'Method `repeat` is deprecated. Please use `withRepeat` instead'
  );
  return withRepeat(_nextAnimation, numberOfReps, reverse, callback);
}

export function loop(
  nextAnimation: NextAnimation,
  numberOfLoops = 1
): Animation {
  'worklet';
  console.warn('Method `loop` is deprecated. Please use `withRepeat` instead');
  return repeat(nextAnimation, Math.round(numberOfLoops * 2), true);
}
