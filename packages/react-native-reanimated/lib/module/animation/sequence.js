'use strict';

import { logger } from '../common';
import { defineAnimation, getReduceMotionForAnimation } from './util';

/**
 * Lets you run animations in a sequence.
 *
 * @param reduceMotion - Determines how the animation responds to the device's
 *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
 *   {@link ReduceMotion}.
 * @param animations - Any number of animation objects to be run in a sequence.
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation/
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withSequence
 */

export function withSequence(_reduceMotionOrFirstAnimation, ..._animations) {
  'worklet';

  let reduceMotion;

  // the first argument is either a config or an animation
  // this is done to allow the reduce motion config prop to be optional
  if (_reduceMotionOrFirstAnimation) {
    if (typeof _reduceMotionOrFirstAnimation === 'string') {
      reduceMotion = _reduceMotionOrFirstAnimation;
    } else {
      _animations.unshift(_reduceMotionOrFirstAnimation);
    }
  }
  if (_animations.length === 0) {
    logger.warn('No animation was provided for the sequence');
    return defineAnimation(0, () => {
      'worklet';

      return {
        onStart: (animation, value) => animation.current = value,
        onFrame: () => true,
        current: 0,
        animationIndex: 0,
        reduceMotion: getReduceMotionForAnimation(reduceMotion)
      };
    });
  }
  return defineAnimation(_animations[0], () => {
    'worklet';

    const animations = _animations.map(a => {
      const result = typeof a === 'function' ? a() : a;
      result.finished = false;
      return result;
    });
    function findNextNonReducedMotionAnimationIndex(index) {
      // the last animation is returned even if reduced motion is enabled,
      // because we want the sequence to finish at the right spot
      while (index < animations.length - 1 && animations[index].reduceMotion) {
        if (typeof animations[index].callback === 'function') {
          animations[index].callback?.(true);
        }
        index++;
      }
      return index;
    }
    const callback = finished => {
      if (finished) {
        // we want to call the callback after every single animation
        // not after all of them
        return;
      }
      // this is going to be called only if sequence has been cancelled
      animations.forEach(animation => {
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
        animation.animationIndex = findNextNonReducedMotionAnimationIndex(animation.animationIndex + 1);
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
      // child animations inherit the setting, unless they already have it defined
      // they will have it defined only if the user used the `reduceMotion` prop
      animations.forEach(anim => {
        if (anim.reduceMotion === undefined) {
          anim.reduceMotion = animation.reduceMotion;
        }
      });
      animation.animationIndex = findNextNonReducedMotionAnimationIndex(0);
      if (previousAnimation === undefined) {
        previousAnimation = animations[animations.length - 1];
      }
      const currentAnimation = animations[animation.animationIndex];
      currentAnimation.onStart(currentAnimation, value, now, previousAnimation);
    }
    return {
      isHigherOrder: true,
      onFrame: sequence,
      onStart,
      animationIndex: 0,
      current: animations[0].current,
      callback,
      reduceMotion: getReduceMotionForAnimation(reduceMotion)
    };
  });
}
//# sourceMappingURL=sequence.js.map