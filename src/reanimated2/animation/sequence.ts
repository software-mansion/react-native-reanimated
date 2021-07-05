import { defineAnimation } from "./animations";
import { Animation } from "./commonTypes";

export function withSequence(..._animations): Animation {
  'worklet';
  return defineAnimation(_animations[0], () => {
    'worklet';
    const animations = _animations.map((a) => {
      const result = typeof a === 'function' ? a() : a;
      result.finished = false;
      return result;
    });
    const firstAnimation = animations[0];

    const callback = (finished) => {
      if (finished) {
        // we want to call the callback after every single animation
        // not after all of them
        return;
      }
      // this is going to be called only if sequence has been cancelled
      animations.forEach((animation) => {
        if (typeof animation.callback === 'function' && !animation.finished) {
          animation.callback(finished);
        }
      });
    };

    function sequence(animation, now) {
      const currentAnim = animations[animation.animationIndex];
      const finished = currentAnim.onFrame(currentAnim, now);
      animation.current = currentAnim.current;
      if (finished) {
        // we want to call the callback after every single animation
        if (currentAnim.callback) {
          currentAnim.callback(true /* finished */);
        }
        currentAnim.finished = true;
        animation.animationIndex += 1;
        if (animation.animationIndex < animations.length) {
          const nextAnim = animations[animation.animationIndex];
          nextAnim.onStart(nextAnim, currentAnim.current, now, currentAnim);
          return false;
        }
        return true;
      }
      return false;
    }

    function onStart(animation, value, now, previousAnimation) {
      if (animations.length === 1) {
        throw Error(
          'withSequence() animation require more than one animation as argument'
        );
      }
      animation.animationIndex = 0;
      if (previousAnimation === undefined) {
        previousAnimation = animations[animations.length - 1];
      }
      firstAnimation.onStart(firstAnimation, value, now, previousAnimation);
    }

    return {
      isHigherOrder: true,
      onFrame: sequence,
      onStart,
      animationIndex: 0,
      current: firstAnimation.current,
      callback,
    };
  });
}

/* Deprecated section, kept for backward compatibility. Will be removed soon */
export function sequence(..._animations) {
  'worklet';
  console.warn(
    'Method `sequence` is deprecated. Please use `withSequence` instead'
  );
  return withSequence(..._animations);
}