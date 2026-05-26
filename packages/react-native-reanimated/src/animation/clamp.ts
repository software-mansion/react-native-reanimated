'use strict';
import { logger } from '../common';
import type {
  Animation,
  AnimationObject,
  ReduceMotion,
  Timestamp,
} from '../commonTypes';
import type { ClampAnimation } from './commonTypes';
import {
  defineAnimation,
  getReduceMotionForAnimation,
  recognizePrefixSuffix,
} from './util';

export function withClamp<TValue extends number | string>(
  config: { min?: TValue; max?: TValue; reduceMotion?: ReduceMotion },
  _animationToClamp: AnimationObject<TValue> | (() => AnimationObject<TValue>)
): Animation<ClampAnimation<TValue>> {
  'worklet';
  return defineAnimation<ClampAnimation<TValue>, AnimationObject<TValue>>(
    _animationToClamp,
    (): ClampAnimation<TValue> => {
      'worklet';
      const animationToClamp =
        typeof _animationToClamp === 'function'
          ? _animationToClamp()
          : _animationToClamp;

      const strippedMin =
        config.min === undefined
          ? undefined
          : recognizePrefixSuffix(config.min).strippedValue;

      const strippedMax =
        config.max === undefined
          ? undefined
          : recognizePrefixSuffix(config.max).strippedValue;

      function clampOnFrame(
        animation: ClampAnimation<TValue>,
        now: Timestamp
      ): boolean {
        const finished = animationToClamp.onFrame(animationToClamp, now);

        if (animationToClamp.current === undefined) {
          logger.warn(
            "Error inside 'withClamp' animation, the inner animation has invalid current value"
          );
          return true;
        } else {
          const { prefix, strippedValue, suffix } = recognizePrefixSuffix(
            animationToClamp.current
          );

          let newValue;

          if (strippedMax !== undefined && strippedMax < strippedValue) {
            newValue = strippedMax;
          } else if (strippedMin !== undefined && strippedMin > strippedValue) {
            newValue = strippedMin;
          } else {
            newValue = strippedValue;
          }

          animation.current = (
            typeof animationToClamp.current === 'number'
              ? newValue
              : `${prefix === undefined ? '' : prefix}${newValue}${
                  suffix === undefined ? '' : suffix
                }`
          ) as TValue;
        }

        return finished;
      }

      function onStart(
        animation: ClampAnimation<TValue>,
        value: TValue,
        now: Timestamp,
        previousAnimation: AnimationObject | null
      ): void {
        animation.current = value;
        animation.previousAnimation = animationToClamp;
        const animationBeforeClamped = previousAnimation?.previousAnimation;
        if (
          config.max !== undefined &&
          config.min !== undefined &&
          config.max < config.min
        ) {
          logger.warn(
            'Wrong config was provided to withClamp. Min value is bigger than max'
          );
        }

        animationToClamp.onStart(
          animationToClamp,
          /**
           * Provide the current value of the previous animation of the clamped
           * animation so we can animate from the original "un-truncated" value
           */
          animationBeforeClamped?.current || value,
          now,
          animationBeforeClamped
        );
      }

      const callback = (finished?: boolean): void => {
        if (animationToClamp.callback) {
          animationToClamp.callback(finished);
        }
      };

      return {
        isHigherOrder: true,
        onFrame: clampOnFrame,
        onStart,
        current: animationToClamp.current!,
        callback,
        previousAnimation: null,
        reduceMotion: getReduceMotionForAnimation(config.reduceMotion),
      };
    }
  );
}
