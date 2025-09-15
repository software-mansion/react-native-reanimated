'use strict';

import { withDelay, withSequence, withTiming } from '../../animation';
import { assertEasingIsWorklet, getReduceMotionFromConfig } from '../../animation/util';
import { ReanimatedError } from '../../common';
import { ReduceMotion } from '../../commonTypes';
import { Easing } from '../../Easing';
class InnerKeyframe {
  reduceMotionV = ReduceMotion.System;
  /*
    Keyframe definition should be passed in the constructor as the map
    which keys are between range 0 - 100 (%) and correspond to the point in the animation progress.
  */
  constructor(definitions) {
    this.definitions = definitions;
  }
  parseDefinitions() {
    /* 
        Each style property contain an array with all their key points: 
        value, duration of transition to that value, and optional easing function (defaults to Linear)
    */
    const parsedKeyframes = {};
    /*
      Parsing keyframes 'from' and 'to'.
    */
    if (this.definitions.from) {
      if (this.definitions['0']) {
        throw new ReanimatedError("You cannot provide both keyframe 0 and 'from' as they both specified initial values.");
      }
      this.definitions['0'] = this.definitions.from;
      delete this.definitions.from;
    }
    if (this.definitions.to) {
      if (this.definitions['100']) {
        throw new ReanimatedError("You cannot provide both keyframe 100 and 'to' as they both specified values at the end of the animation.");
      }
      this.definitions['100'] = this.definitions.to;
      delete this.definitions.to;
    }
    /* 
      One of the assumptions is that keyframe  0 is required to properly set initial values.
      Every other keyframe should contain properties from the set provided as initial values.
    */
    if (!this.definitions['0']) {
      throw new ReanimatedError("Please provide 0 or 'from' keyframe with initial state of your object.");
    }
    const initialValues = this.definitions['0'];
    /*
      Initialize parsedKeyframes for properties provided in initial keyframe
    */
    Object.keys(initialValues).forEach(styleProp => {
      if (styleProp === 'transform') {
        if (!Array.isArray(initialValues.transform)) {
          return;
        }
        initialValues.transform.forEach((transformStyle, index) => {
          Object.keys(transformStyle).forEach(transformProp => {
            parsedKeyframes[makeKeyframeKey(index, transformProp)] = [];
          });
        });
      } else {
        parsedKeyframes[styleProp] = [];
      }
    });
    const duration = this.durationV ? this.durationV : 500;
    const animationKeyPoints = Array.from(Object.keys(this.definitions)).map(Number);
    const getAnimationDuration = (key, currentKeyPoint) => {
      const maxDuration = currentKeyPoint / 100 * duration;
      const currentDuration = parsedKeyframes[key].reduce((acc, value) => acc + value.duration, 0);
      return maxDuration - currentDuration;
    };

    /* 
       Other keyframes can't contain properties that were not specified in initial keyframe.
    */
    const addKeyPoint = ({
      key,
      value,
      currentKeyPoint,
      easing
    }) => {
      if (!(key in parsedKeyframes)) {
        throw new ReanimatedError("Keyframe can contain only that set of properties that were provide with initial values (keyframe 0 or 'from')");
      }
      if (__DEV__ && easing) {
        assertEasingIsWorklet(easing);
      }
      parsedKeyframes[key].push({
        duration: getAnimationDuration(key, currentKeyPoint),
        value,
        easing
      });
    };
    animationKeyPoints.filter(value => value !== 0).sort((a, b) => a - b).forEach(keyPoint => {
      if (keyPoint < 0 || keyPoint > 100) {
        throw new ReanimatedError('Keyframe should be in between range 0 - 100.');
      }
      const keyframe = this.definitions[keyPoint];
      const easing = keyframe.easing;
      delete keyframe.easing;
      const addKeyPointWith = (key, value) => addKeyPoint({
        key,
        value,
        currentKeyPoint: keyPoint,
        easing
      });
      Object.keys(keyframe).forEach(key => {
        if (key === 'transform') {
          if (!Array.isArray(keyframe.transform)) {
            return;
          }
          keyframe.transform.forEach((transformStyle, index) => {
            Object.keys(transformStyle).forEach(transformProp => {
              addKeyPointWith(makeKeyframeKey(index, transformProp), transformStyle[transformProp] // Here we assume that user has passed props of proper type.
              // I don't think it's worthwhile to check if he passed i.e. `Animated.Node`.
              );
            });
          });
        } else {
          addKeyPointWith(key, keyframe[key]);
        }
      });
    });
    return {
      initialValues,
      keyframes: parsedKeyframes
    };
  }
  duration(durationMs) {
    this.durationV = durationMs;
    return this;
  }
  delay(delayMs) {
    this.delayV = delayMs;
    return this;
  }
  withCallback(callback) {
    this.callbackV = callback;
    return this;
  }
  reduceMotion(reduceMotionV) {
    this.reduceMotionV = reduceMotionV;
    return this;
  }
  getDelayFunction() {
    const delay = this.delayV;
    const reduceMotion = this.reduceMotionV;
    return delay ?
    // eslint-disable-next-line @typescript-eslint/no-shadow
    (delay, animation) => {
      'worklet';

      return withDelay(delay, animation, reduceMotion);
    } : (_, animation) => {
      'worklet';

      animation.reduceMotion = getReduceMotionFromConfig(reduceMotion);
      return animation;
    };
  }
  build = () => {
    const delay = this.delayV;
    const delayFunction = this.getDelayFunction();
    const {
      keyframes,
      initialValues
    } = this.parseDefinitions();
    const callback = this.callbackV;
    if (this.parsedAnimation) {
      return this.parsedAnimation;
    }
    this.parsedAnimation = () => {
      'worklet';

      const animations = {};

      /* 
            For each style property, an animations sequence is created that corresponds with its key points.
            Transform style properties require special handling because of their nested structure.
      */
      const addAnimation = key => {
        const keyframePoints = keyframes[key];
        // in case if property was only passed as initial value
        if (keyframePoints.length === 0) {
          return;
        }
        const animation = delayFunction(delay, keyframePoints.length === 1 ? withTiming(keyframePoints[0].value, {
          duration: keyframePoints[0].duration,
          easing: keyframePoints[0].easing ? keyframePoints[0].easing : Easing.linear
        }) : withSequence(...keyframePoints.map(keyframePoint => withTiming(keyframePoint.value, {
          duration: keyframePoint.duration,
          easing: keyframePoint.easing ? keyframePoint.easing : Easing.linear
        }))));
        if (key.includes('transform')) {
          if (!('transform' in animations)) {
            animations.transform = [];
          }
          animations.transform.push({
            [key.split(':')[1]]: animation
          });
        } else {
          animations[key] = animation;
        }
      };
      Object.keys(initialValues).forEach(key => {
        if (key.includes('transform')) {
          initialValues[key].forEach((transformProp, index) => {
            Object.keys(transformProp).forEach(transformPropKey => {
              addAnimation(makeKeyframeKey(index, transformPropKey));
            });
          });
        } else {
          addAnimation(key);
        }
      });
      return {
        animations,
        initialValues,
        callback
      };
    };
    return this.parsedAnimation;
  };
}
function makeKeyframeKey(index, transformProp) {
  'worklet';

  return `${index}_transform:${transformProp}`;
}
export const Keyframe = InnerKeyframe;
//# sourceMappingURL=Keyframe.js.map