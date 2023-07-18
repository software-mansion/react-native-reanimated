import type {
  HigherOrderAnimation,
  NextAnimation,
  ReducedMotionConfig,
  StyleLayoutAnimation,
} from './commonTypes';
/* global _WORKLET */
import type { ParsedColorArray } from '../Colors';
import {
  isColor,
  convertToRGBA,
  rgbaArrayToRGBAColor,
  toGammaSpace,
  toLinearSpace,
} from '../Colors';

import type {
  AnimatedStyle,
  SharedValue,
  AnimatableValue,
  Animation,
  AnimationObject,
  Timestamp,
  AnimatableValueObject,
} from '../commonTypes';
import NativeReanimatedModule from '../NativeReanimated';
import { isWeb } from '../PlatformChecker';

let IN_STYLE_UPDATER = false;

const IS_REDUCED_MOTION = isWeb()
  ? !window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  : _REANIMATED_IS_REDUCED_MOTION ?? false;

export type UserUpdater = () => AnimatedStyle;

export function initialUpdaterRun<T>(updater: () => T): T {
  IN_STYLE_UPDATER = true;
  const result = updater();
  IN_STYLE_UPDATER = false;
  return result;
}

interface RecognizedPrefixSuffix {
  prefix?: string;
  suffix?: string;
  strippedValue: number;
}

function recognizePrefixSuffix(value: string | number): RecognizedPrefixSuffix {
  'worklet';
  if (typeof value === 'string') {
    const match = value.match(
      /([A-Za-z]*)(-?\d*\.?\d*)([eE][-+]?[0-9]+)?([A-Za-z%]*)/
    );
    if (!match) {
      throw Error(
        "Couldn't parse animation value. Check if there isn't any typo."
      );
    }
    const prefix = match[1];
    const suffix = match[4];
    // number with scientific notation
    const number = match[2] + (match[3] ?? '');
    return { prefix, suffix, strippedValue: parseFloat(number) };
  } else {
    return { strippedValue: value };
  }
}

export function shouldReduceMotion(config?: ReducedMotionConfig) {
  'worklet';
  if (config === undefined) {
    return undefined;
  }

  return config === 'system' ? IS_REDUCED_MOTION : config === 'always';
}

function decorateAnimation<T extends AnimationObject | StyleLayoutAnimation>(
  animation: T
): void {
  'worklet';
  const baseOnStart = (animation as Animation<AnimationObject>).onStart;
  const baseOnFrame = (animation as Animation<AnimationObject>).onFrame;

  if ((animation as HigherOrderAnimation).isHigherOrder) {
    animation.onStart = (
      animation: Animation<AnimationObject>,
      value: number,
      timestamp: Timestamp,
      previousAnimation: Animation<AnimationObject>
    ) => {
      if (animation.reduceMotion === undefined) {
        animation.reduceMotion = shouldReduceMotion('system');
      }
      return baseOnStart(animation, value, timestamp, previousAnimation);
    };
    return;
  }

  const animationCopy = Object.assign({}, animation);
  delete animationCopy.callback;

  const prefNumberSuffOnStart = (
    animation: Animation<AnimationObject>,
    value: string | number,
    timestamp: number,
    previousAnimation: Animation<AnimationObject>
  ) => {
    // recognize prefix, suffix, and updates stripped value on animation start
    const { prefix, suffix, strippedValue } = recognizePrefixSuffix(value);
    animation.__prefix = prefix;
    animation.__suffix = suffix;
    animation.strippedCurrent = strippedValue;
    const { strippedValue: strippedToValue } = recognizePrefixSuffix(
      animation.toValue as string | number
    );
    animation.current = strippedValue;
    animation.startValue = strippedValue;
    animation.toValue = strippedToValue;
    if (previousAnimation && previousAnimation !== animation) {
      const {
        prefix: paPrefix,
        suffix: paSuffix,
        strippedValue: paStrippedValue,
      } = recognizePrefixSuffix(previousAnimation.current as string | number);
      previousAnimation.current = paStrippedValue;
      previousAnimation.__prefix = paPrefix;
      previousAnimation.__suffix = paSuffix;
    }

    baseOnStart(animation, strippedValue, timestamp, previousAnimation);

    animation.current =
      (animation.__prefix ?? '') +
      animation.current +
      (animation.__suffix ?? '');

    if (previousAnimation && previousAnimation !== animation) {
      previousAnimation.current =
        (previousAnimation.__prefix ?? '') +
        previousAnimation.current +
        (previousAnimation.__suffix ?? '');
    }
  };
  const prefNumberSuffOnFrame = (
    animation: Animation<AnimationObject>,
    timestamp: number
  ) => {
    animation.current = animation.strippedCurrent;
    const res = baseOnFrame(animation, timestamp);
    animation.strippedCurrent = animation.current;
    animation.current =
      (animation.__prefix ?? '') +
      animation.current +
      (animation.__suffix ?? '');
    return res;
  };

  const tab = ['R', 'G', 'B', 'A'];
  const colorOnStart = (
    animation: Animation<AnimationObject>,
    value: string | number,
    timestamp: Timestamp,
    previousAnimation: Animation<AnimationObject>
  ): void => {
    let RGBAValue: ParsedColorArray;
    let RGBACurrent: ParsedColorArray;
    let RGBAToValue: ParsedColorArray;
    const res: Array<number> = [];
    if (isColor(value)) {
      RGBACurrent = toLinearSpace(convertToRGBA(animation.current));
      RGBAValue = toLinearSpace(convertToRGBA(value));
      if (animation.toValue) {
        RGBAToValue = toLinearSpace(convertToRGBA(animation.toValue));
      }
    }
    tab.forEach((i, index) => {
      animation[i] = Object.assign({}, animationCopy);
      animation[i].current = RGBACurrent[index];
      animation[i].toValue = RGBAToValue ? RGBAToValue[index] : undefined;
      animation[i].onStart(
        animation[i],
        RGBAValue[index],
        timestamp,
        previousAnimation ? previousAnimation[i] : undefined
      );
      res.push(animation[i].current);
    });

    animation.current = rgbaArrayToRGBAColor(
      toGammaSpace(res as ParsedColorArray)
    );
  };

  const colorOnFrame = (
    animation: Animation<AnimationObject>,
    timestamp: Timestamp
  ): boolean => {
    const RGBACurrent = toLinearSpace(convertToRGBA(animation.current));
    const res: Array<number> = [];
    let finished = true;
    tab.forEach((i, index) => {
      animation[i].current = RGBACurrent[index];
      const result = animation[i].onFrame(animation[i], timestamp);
      // We really need to assign this value to result, instead of passing it directly - otherwise once "finished" is false, onFrame won't be called
      finished &&= result;
      res.push(animation[i].current);
    });

    animation.current = rgbaArrayToRGBAColor(
      toGammaSpace(res as ParsedColorArray)
    );
    return finished;
  };

  const arrayOnStart = (
    animation: Animation<AnimationObject>,
    value: Array<number>,
    timestamp: Timestamp,
    previousAnimation: Animation<AnimationObject>
  ): void => {
    value.forEach((v, i) => {
      animation[i] = Object.assign({}, animationCopy);
      animation[i].current = v;
      animation[i].toValue = (animation.toValue as Array<number>)[i];
      animation[i].onStart(
        animation[i],
        v,
        timestamp,
        previousAnimation ? previousAnimation[i] : undefined
      );
    });

    animation.current = value;
  };

  const arrayOnFrame = (
    animation: Animation<AnimationObject>,
    timestamp: Timestamp
  ): boolean => {
    let finished = true;
    (animation.current as Array<number>).forEach((_, i) => {
      const result = animation[i].onFrame(animation[i], timestamp);
      // We really need to assign this value to result, instead of passing it directly - otherwise once "finished" is false, onFrame won't be called
      finished &&= result;
      (animation.current as Array<number>)[i] = animation[i].current;
    });

    return finished;
  };

  const objectOnStart = (
    animation: Animation<AnimationObject>,
    value: AnimatableValueObject,
    timestamp: Timestamp,
    previousAnimation: Animation<AnimationObject>
  ): void => {
    for (const key in value) {
      animation[key] = Object.assign({}, animationCopy);
      animation[key].onStart = animation.onStart;

      animation[key].current = value[key];
      animation[key].toValue = (animation.toValue as AnimatableValueObject)[
        key
      ];
      animation[key].onStart(
        animation[key],
        value[key],
        timestamp,
        previousAnimation ? previousAnimation[key] : undefined
      );
    }
    animation.current = value;
  };

  const objectOnFrame = (
    animation: Animation<AnimationObject>,
    timestamp: Timestamp
  ): boolean => {
    let finished = true;
    const newObject: AnimatableValueObject = {};
    for (const key in animation.current as AnimatableValueObject) {
      const result = animation[key].onFrame(animation[key], timestamp);
      // We really need to assign this value to result, instead of passing it directly - otherwise once "finished" is false, onFrame won't be called
      finished &&= result;
      newObject[key] = animation[key].current;
    }
    animation.current = newObject;
    return finished;
  };

  animation.onStart = (
    animation: Animation<AnimationObject>,
    value: number,
    timestamp: Timestamp,
    previousAnimation: Animation<AnimationObject>
  ) => {
    if (animation.reduceMotion === undefined) {
      animation.reduceMotion = shouldReduceMotion('system');
    }
    if (animation.reduceMotion) {
      animation.current = animation.toValue;
      animation.startTime = 0;
      animation.onFrame = (_: Animation<AnimationObject>, __: Timestamp) => {
        return true;
      };
      return;
    }
    if (isColor(value)) {
      colorOnStart(animation, value, timestamp, previousAnimation);
      animation.onFrame = colorOnFrame;
      return;
    } else if (Array.isArray(value)) {
      arrayOnStart(animation, value, timestamp, previousAnimation);
      animation.onFrame = arrayOnFrame;
      return;
    } else if (typeof value === 'string') {
      prefNumberSuffOnStart(animation, value, timestamp, previousAnimation);
      animation.onFrame = prefNumberSuffOnFrame;
      return;
    } else if (typeof value === 'object' && value !== null) {
      objectOnStart(animation, value, timestamp, previousAnimation);
      animation.onFrame = objectOnFrame;
      return;
    }
    baseOnStart(animation, value, timestamp, previousAnimation);
  };
}

type AnimationToDecoration<
  T extends AnimationObject | StyleLayoutAnimation,
  U extends AnimationObject | StyleLayoutAnimation
> = T extends StyleLayoutAnimation
  ? Record<string, unknown>
  : U | (() => U) | AnimatableValue;

const IS_NATIVE = NativeReanimatedModule.native;

export function defineAnimation<
  T extends AnimationObject | StyleLayoutAnimation, // type that's supposed to be returned
  U extends AnimationObject | StyleLayoutAnimation = T // type that's received
>(starting: AnimationToDecoration<T, U>, factory: () => T): T {
  'worklet';
  if (IN_STYLE_UPDATER) {
    return starting as unknown as T;
  }
  const create = () => {
    'worklet';
    const animation = factory();
    decorateAnimation<U>(animation as unknown as U);
    return animation;
  };

  if (_WORKLET || !IS_NATIVE) {
    return create();
  }
  // @ts-ignore: eslint-disable-line
  return create;
}

export function cancelAnimation<T>(sharedValue: SharedValue<T>): void {
  'worklet';
  // setting the current value cancels the animation if one is currently running
  sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
}

// TODO it should work only if there was no animation before.
export function withStartValue(
  startValue: AnimatableValue,
  animation: NextAnimation<AnimationObject>
): Animation<AnimationObject> {
  'worklet';
  return defineAnimation(startValue, () => {
    'worklet';
    if (!_WORKLET && typeof animation === 'function') {
      animation = animation();
    }
    (animation as Animation<AnimationObject>).current = startValue;
    return animation as Animation<AnimationObject>;
  });
}
