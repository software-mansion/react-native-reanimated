'use strict';

import { logger } from '../common';
import { defineAnimation, getReduceMotionForAnimation, recognizePrefixSuffix } from './util';
export const withClamp = function (config, _animationToClamp) {
  'worklet';

  return defineAnimation(_animationToClamp, () => {
    'worklet';

    const animationToClamp = typeof _animationToClamp === 'function' ? _animationToClamp() : _animationToClamp;
    const strippedMin = config.min === undefined ? undefined : recognizePrefixSuffix(config.min).strippedValue;
    const strippedMax = config.max === undefined ? undefined : recognizePrefixSuffix(config.max).strippedValue;
    function clampOnFrame(animation, now) {
      const finished = animationToClamp.onFrame(animationToClamp, now);
      if (animationToClamp.current === undefined) {
        logger.warn("Error inside 'withClamp' animation, the inner animation has invalid current value");
        return true;
      } else {
        const {
          prefix,
          strippedValue,
          suffix
        } = recognizePrefixSuffix(animationToClamp.current);
        let newValue;
        if (strippedMax !== undefined && strippedMax < strippedValue) {
          newValue = strippedMax;
        } else if (strippedMin !== undefined && strippedMin > strippedValue) {
          newValue = strippedMin;
        } else {
          newValue = strippedValue;
        }
        animation.current = typeof animationToClamp.current === 'number' ? newValue : `${prefix === undefined ? '' : prefix}${newValue}${suffix === undefined ? '' : suffix}`;
      }
      return finished;
    }
    function onStart(animation, value, now, previousAnimation) {
      animation.current = value;
      animation.previousAnimation = animationToClamp;
      const animationBeforeClamped = previousAnimation?.previousAnimation;
      if (config.max !== undefined && config.min !== undefined && config.max < config.min) {
        logger.warn('Wrong config was provided to withClamp. Min value is bigger than max');
      }
      animationToClamp.onStart(animationToClamp,
      /**
       * Provide the current value of the previous animation of the clamped
       * animation so we can animate from the original "un-truncated" value
       */
      animationBeforeClamped?.current || value, now, animationBeforeClamped);
    }
    const callback = finished => {
      if (animationToClamp.callback) {
        animationToClamp.callback(finished);
      }
    };
    return {
      isHigherOrder: true,
      onFrame: clampOnFrame,
      onStart,
      current: animationToClamp.current,
      callback,
      previousAnimation: null,
      reduceMotion: getReduceMotionForAnimation(config.reduceMotion)
    };
  });
};
//# sourceMappingURL=clamp.js.map