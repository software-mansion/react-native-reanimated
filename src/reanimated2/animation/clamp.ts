'use strict';
import {
  defineAnimation,
  getReduceMotionForAnimation,
} from './defineAnimation';
import type {
  Animation,
  Timestamp,
  AnimatableValue,
  AnimationObject,
  ReduceMotion,
} from '../commonTypes';
import type { ClampAnimation } from './commonTypes';
import { recognizePrefixSuffix } from './utils';

type withClampType = <T extends number | string>(
  config: {
    min?: T;
    max?: T;
    reduceMotion?: ReduceMotion;
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
          console.warn(
            "[Reanimated] Error inside 'withClamp' animation, the inner animation has invalid current value"
          );
          return true;
        } else {
          const { strippedValue, suffix } = recognizePrefixSuffix(
            animationToClamp.current
          );

          let newValue;

          if (strippedMax !== undefined && strippedMax < strippedValue) {
            newValue = config.max;
          } else if (strippedMin !== undefined && strippedMin > strippedValue) {
            newValue = config.min;
          } else {
            newValue = strippedValue;
          }

          animation.current =
            typeof animationToClamp.current === 'number'
              ? (newValue as number)
              : `${newValue}${suffix === undefined ? '' : suffix}`;
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
        if (previousAnimation === animation) {
          animation.previousAnimation = previousAnimation.previousAnimation;
        } else {
          animation.previousAnimation = previousAnimation;
        }

        // child animations inherit the setting, unless they already have it defined
        // they will have it defined only if the user used the `reduceMotion` prop
        if (animationToClamp.reduceMotion === undefined) {
          animationToClamp.reduceMotion = animation.reduceMotion;
        }

        animationToClamp.onStart(
          animationToClamp,
          value,
          now,
          previousAnimation
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
