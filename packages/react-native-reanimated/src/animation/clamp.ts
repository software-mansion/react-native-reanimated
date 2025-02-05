'use strict';
import type {
  AnimatableValue,
  Animation,
  AnimationObject,
  ReduceMotion,
  Timestamp,
} from '../commonTypes';
import { logger } from '../logger';
import type { ClampAnimation } from './commonTypes';
import {
  defineAnimation,
  getReduceMotionForAnimation,
  recognizePrefixSuffix,
} from './util';

type withClampType = <T extends number | string>(
  config: {
    min?: T;
    max?: T;
  },
  clampedAnimation: T
) => T;

export const withClamp = function <T extends number | string>(
  config: { min?: T; max?: T; reduceMotion?: ReduceMotion },
  _animationToClamp: AnimationObject<T> | (() => AnimationObject<T>)
): Animation<ClampAnimation> {
  'worklet';
  return defineAnimation<ClampAnimation, AnimationObject<T>>(
    _animationToClamp,
    (): ClampAnimation => {
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
        animation: ClampAnimation,
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

          animation.current =
            typeof animationToClamp.current === 'number'
              ? newValue
              : `${prefix === undefined ? '' : prefix}${newValue}${
                  suffix === undefined ? '' : suffix
                }`;
        }

        return finished;
      }

      function onStart(
        animation: Animation<any>,
        value: AnimatableValue,
        now: Timestamp,
        previousAnimation: Animation<any> | null
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
} as withClampType;
