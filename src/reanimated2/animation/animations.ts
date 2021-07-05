/* global _WORKLET */
import { isColor, convertToHSVA, toRGBA } from '../Colors';
import NativeReanimated from '../NativeReanimated';

export type AnimationStyle = Record<string, unknown>; // temporary, change to style object
export type Updater = () => AnimationStyle;

let IN_STYLE_UPDATER = false;

export function initialUpdaterRun(updater: Updater): AnimationStyle {
  IN_STYLE_UPDATER = true;
  const result = updater();
  IN_STYLE_UPDATER = false;
  return result;
}

export function transform(value, handler) {
  'worklet';
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    // toInt
    // TODO handle color
    const match = value.match(/([A-Za-z]*)(-?\d*\.?\d*)([A-Za-z%]*)/);
    const prefix = match[1];
    const suffix = match[3];
    const number = match[2];
    handler.__prefix = prefix;
    handler.__suffix = suffix;
    return parseFloat(number);
  }

  // toString if __prefix is available and number otherwise
  if (handler.__prefix === undefined) {
    return value;
  }

  return handler.__prefix + value + handler.__suffix;
}

export function transformAnimation(animation) {
  'worklet';
  if (!animation) {
    return;
  }
  animation.toValue = transform(animation.toValue, animation);
  animation.current = transform(animation.current, animation);
  animation.startValue = transform(animation.startValue, animation);
}

export function decorateAnimation(animation) {
  'worklet';
  if (animation.isHigherOrder) {
    return;
  }
  const baseOnStart = animation.onStart;
  const baseOnFrame = animation.onFrame;
  const animationCopy = Object.assign({}, animation);
  delete animationCopy.callback;

  const prefNumberSuffOnStart = (
    animation,
    value,
    timestamp,
    previousAnimation
  ) => {
    const val = transform(value, animation);
    transformAnimation(animation);
    if (previousAnimation !== animation) transformAnimation(previousAnimation);

    baseOnStart(animation, val, timestamp, previousAnimation);

    transformAnimation(animation);
    if (previousAnimation !== animation) transformAnimation(previousAnimation);
  };
  const prefNumberSuffOnFrame = (animation, timestamp) => {
    transformAnimation(animation);

    const res = baseOnFrame(animation, timestamp);

    transformAnimation(animation);
    return res;
  };

  const tab = ['H', 'S', 'V', 'A'];
  const colorOnStart = (animation, value, timestamp, previousAnimation) => {
    let HSVAValue;
    let HSVACurrent;
    let HSVAToValue;
    const res = [];
    if (isColor(value)) {
      HSVACurrent = convertToHSVA(animation.current);
      HSVAValue = convertToHSVA(value);
      if (animation.toValue) {
        HSVAToValue = convertToHSVA(animation.toValue);
      }
    }
    tab.forEach((i, index) => {
      animation[i] = Object.assign({}, animationCopy);
      animation[i].current = HSVACurrent[index];
      animation[i].toValue = HSVAToValue ? HSVAToValue[index] : undefined;
      animation[i].onStart(
        animation[i],
        HSVAValue[index],
        timestamp,
        previousAnimation ? previousAnimation[i] : undefined
      );
      res.push(animation[i].current);
    });

    animation.current = toRGBA(res);
  };

  const colorOnFrame = (animation, timestamp) => {
    const HSVACurrent = convertToHSVA(animation.current);
    const res = [];
    let finished = true;
    tab.forEach((i, index) => {
      animation[i].current = HSVACurrent[index];
      finished &= animation[i].onFrame(animation[i], timestamp);
      res.push(animation[i].current);
    });

    animation.current = toRGBA(res);
    return finished;
  };

  animation.onStart = (animation, value, timestamp, previousAnimation) => {
    if (isColor(value)) {
      colorOnStart(animation, value, timestamp, previousAnimation);
      animation.onFrame = colorOnFrame;
      return;
    } else if (typeof value === 'string') {
      prefNumberSuffOnStart(animation, value, timestamp, previousAnimation);
      animation.onFrame = prefNumberSuffOnFrame;
      return;
    }
    baseOnStart(animation, value, timestamp, previousAnimation);
  };
}

export function defineAnimation(starting, factory) {
  'worklet';
  if (IN_STYLE_UPDATER) {
    return starting;
  }
  const create = () => {
    'worklet';
    const animation = factory();
    decorateAnimation(animation);
    return animation;
  };

  if (_WORKLET || !NativeReanimated.native) {
    return create();
  }
  return create;
}

export function cancelAnimation(sharedValue) {
  'worklet';
  // setting the current value cancels the animation if one is currently running
  sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
}

// TODO it should work only if there was no animation before.
export function withStartValue(startValue, animation) {
  'worklet';
  return defineAnimation(startValue, () => {
    'worklet';
    if (!_WORKLET && typeof animation === 'function') {
      animation = animation();
    }
    animation.current = startValue;
    return animation;
  });
}

// export function withStyleAnimation(styleAnimations) {
//   'worklet';
//   return defineAnimation({}, () => {
//     'worklet';

//     const onFrame = (animation, now) => {
//       let stillGoing = false;
//       Object.keys(styleAnimations).forEach((key) => {
//         const currentAnimation = animation.styleAnimations[key];
//         if (key === 'transform') {
//           const transform = animation.styleAnimations.transform;
//           for (let i = 0; i < transform.length; i++) {
//             const type = Object.keys(transform[i])[0];
//             const currentAnimation = transform[i][type];
//             if (currentAnimation.finished) {
//               continue;
//             }
//             const finished = currentAnimation.onFrame(currentAnimation, now);
//             if (finished) {
//               currentAnimation.finished = true;
//               if (currentAnimation.callback) {
//                 currentAnimation.callback(true);
//               }
//             } else {
//               stillGoing = true;
//             }
//             animation.current.transform[i][type] = currentAnimation.current;
//           }
//         } else {
//           if (!currentAnimation.finished) {
//             const finished = currentAnimation.onFrame(currentAnimation, now);
//             if (finished) {
//               currentAnimation.finished = true;
//               if (currentAnimation.callback) {
//                 currentAnimation.callback(true);
//               }
//             } else {
//               stillGoing = true;
//             }
//             animation.current[key] = currentAnimation.current;
//           }
//         }
//       });
//       return !stillGoing;
//     };

//     const onStart = (animation, value, now, previousAnimation) => {
//       Object.keys(styleAnimations).forEach((key) => {
//         if (key === 'transform') {
//           animation.current.transform = [];
//           const transform = styleAnimations.transform;
//           const prevTransform = null;
//           const valueTransform = value.transform;
//           if (
//             previousAnimation &&
//             previousAnimation.styleAnimations &&
//             previousAnimation.styleAnimations.transform
//           ) {
//             prevAnimation = previousAnimation.styleAnimations.transform;
//           }

//           for (let i = 0; i < transform.length; i++) {
//             // duplication of code to avoid function calls
//             let prevAnimation = null;
//             const type = Object.keys(transform[i])[0];
//             if (prevTransform && prevTransform.length > i) {
//               const prevTransformStep = prevTransform[i];
//               const prevType = Object.keys(prevTransformStep)[0];
//               if (prevType === type) {
//                 prevAnimation = prevTransformStep[prevType];
//               }
//             }

//             let prevVal = 0;
//             if (prevAnimation != null) {
//               prevVal = prevAnimation.current;
//             }
//             if (
//               valueTransform != null &&
//               valueTransform.length > i &&
//               valueTransform[i][type]
//             ) {
//               prevVal = valueTransform[i][type];
//             }
//             const obj = {};
//             obj[type] = prevVal;
//             animation.current.transform[i] = obj;
//             let currentAnimation = transform[i][type];
//             if (
//               typeof currentAnimation !== 'object' &&
//               !Array.isArray(currentAnimation)
//             ) {
//               currentAnimation = withTiming(currentAnimation, { duration: 0 });
//               transform[i][type] = currentAnimation;
//             }
//             currentAnimation.onStart(
//               currentAnimation,
//               prevVal,
//               now,
//               prevAnimation
//             );
//           }
//         } else {
//           let prevAnimation = null;
//           if (
//             previousAnimation &&
//             previousAnimation.styleAnimations &&
//             previousAnimation.styleAnimations[key]
//           ) {
//             prevAnimation = previousAnimation.styleAnimations[key];
//           }
//           let prevVal = 0;
//           if (prevAnimation != null) {
//             prevVal = prevAnimation.current;
//           }
//           if (value[key]) {
//             prevVal = value[key];
//           }
//           animation.current[key] = prevVal;
//           let currentAnimation = animation.styleAnimations[key];
//           if (
//             typeof currentAnimation !== 'object' &&
//             !Array.isArray(currentAnimation)
//           ) {
//             currentAnimation = withTiming(currentAnimation, { duration: 0 });
//             animation.styleAnimations[key] = currentAnimation;
//           }
//           currentAnimation.onStart(
//             currentAnimation,
//             prevVal,
//             now,
//             prevAnimation
//           );
//         }
//       });
//     };

//     const callback = (finished) => {
//       if (!finished) {
//         Object.keys(styleAnimations).forEach((key) => {
//           const currentAnimation = styleAnimations[key];
//           if (key === 'transform') {
//             const transform = styleAnimations.transform;
//             for (let i = 0; i < transform.length; i++) {
//               const type = Object.keys(transform[i])[0];
//               const currentAnimation = transform[i][type];
//               if (currentAnimation.finished) {
//                 continue;
//               }
//               if (currentAnimation.callback) {
//                 currentAnimation.callback(false);
//               }
//             }
//           } else {
//             if (!currentAnimation.finished) {
//               if (currentAnimation.callback) {
//                 currentAnimation.callback(false);
//               }
//             }
//           }
//         });
//       }
//     };

//     return {
//       isHigherOrder: true,
//       onFrame,
//       onStart,
//       current: {},
//       styleAnimations,
//       callback,
//     };
//   });
// }

export function withDelay(delayMs, _nextAnimation) {
  'worklet';
  return defineAnimation(_nextAnimation, () => {
    'worklet';
    const nextAnimation =
      typeof _nextAnimation === 'function' ? _nextAnimation() : _nextAnimation;

    function delay(animation, now) {
      const { startTime, started, previousAnimation } = animation;

      if (now - startTime > delayMs) {
        if (!started) {
          nextAnimation.onStart(
            nextAnimation,
            animation.current,
            now,
            previousAnimation
          );
          animation.previousAnimation = null;
          animation.started = true;
        }
        const finished = nextAnimation.onFrame(nextAnimation, now);
        animation.current = nextAnimation.current;
        return finished;
      } else if (previousAnimation) {
        const finished = previousAnimation.onFrame(previousAnimation, now);
        animation.current = previousAnimation.current;
        if (finished) {
          animation.previousAnimation = null;
        }
      }
      return false;
    }

    function onStart(animation, value, now, previousAnimation) {
      animation.startTime = now;
      animation.started = false;
      animation.current = value;
      animation.previousAnimation = previousAnimation;
    }

    const callback = (finished) => {
      if (nextAnimation.callback) {
        nextAnimation.callback(finished);
      }
    };

    return {
      isHigherOrder: true,
      onFrame: delay,
      onStart,
      current: nextAnimation.current,
      callback,
    };
  });
}

export function withSequence(..._animations) {
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

export function withRepeat(
  _nextAnimation,
  numberOfReps = 2,
  reverse = false,
  callback
) {
  'worklet';

  return defineAnimation(_nextAnimation, () => {
    'worklet';

    const nextAnimation =
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

    const repCallback = (finished) => {
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
export function delay(delayMs, _nextAnimation) {
  'worklet';
  console.warn('Method `delay` is deprecated. Please use `withDelay` instead');
  return withDelay(delayMs, _nextAnimation);
}

export function repeat(
  _nextAnimation,
  numberOfReps = 2,
  reverse = false,
  callback
) {
  'worklet';
  console.warn(
    'Method `repeat` is deprecated. Please use `withRepeat` instead'
  );
  return withRepeat(_nextAnimation, numberOfReps, reverse, callback);
}

export function loop(nextAnimation, numberOfLoops = 1) {
  'worklet';
  console.warn('Method `loop` is deprecated. Please use `withRepeat` instead');
  return repeat(nextAnimation, Math.round(numberOfLoops * 2), true);
}

export function sequence(..._animations) {
  'worklet';
  console.warn(
    'Method `sequence` is deprecated. Please use `withSequence` instead'
  );
  return withSequence(..._animations);
}
/* Deprecated section end */
