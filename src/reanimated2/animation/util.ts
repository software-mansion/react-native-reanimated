'use strict';
import type { HigherOrderAnimation, StyleLayoutAnimation } from './commonTypes';
import type { ParsedColorArray } from '../Colors';
import {
  isColor,
  convertToRGBA,
  rgbaArrayToRGBAColor,
  toGammaSpace,
  toLinearSpace,
} from '../Colors';
import { ReduceMotion } from '../commonTypes';
import type {
  SharedValue,
  AnimatableValue,
  Animation,
  AnimationObject,
  Timestamp,
  AnimatableValueObject,
} from '../commonTypes';
import type {
  AffineMatrixFlat,
  AffineMatrix,
} from './transformationMatrix/matrixUtils';
import {
  flatten,
  multiplyMatrices,
  scaleMatrix,
  addMatrices,
  decomposeMatrixIntoMatricesAndAngles,
  isAffineMatrixFlat,
  subtractMatrices,
  getRotationMatrix,
} from './transformationMatrix/matrixUtils';
import { isReducedMotion, shouldBeUseWeb } from '../PlatformChecker';

let IN_STYLE_UPDATER = false;
const IS_REDUCED_MOTION = isReducedMotion();

export function initialUpdaterRun<T>(updater: () => T) {
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

export function recognizePrefixSuffix(
  value: string | number
): RecognizedPrefixSuffix {
  'worklet';
  if (typeof value === 'string') {
    const match = value.match(
      /([A-Za-z]*)(-?\d*\.?\d*)([eE][-+]?[0-9]+)?([A-Za-z%]*)/
    );
    if (!match) {
      throw new Error("[Reanimated] Couldn't parse animation value.");
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

/**
 * Returns whether the motion should be reduced for a specified config.
 * By default returns the system setting.
 */
export function getReduceMotionFromConfig(config?: ReduceMotion) {
  'worklet';
  return !config || config === ReduceMotion.System
    ? IS_REDUCED_MOTION
    : config === ReduceMotion.Always;
}

/**
 * Returns the value that should be assigned to `animation.reduceMotion`
 * for a given config. If the config is not defined, `undefined` is returned.
 */
export function getReduceMotionForAnimation(config?: ReduceMotion) {
  'worklet';
  // if the config is not defined, we want `reduceMotion` to be undefined,
  // so the parent animation knows if it should overwrite it
  if (!config) {
    return undefined;
  }

  return getReduceMotionFromConfig(config);
}

function applyProgressToMatrix(
  progress: number,
  a: AffineMatrix,
  b: AffineMatrix
) {
  'worklet';
  return addMatrices(a, scaleMatrix(subtractMatrices(b, a), progress));
}

function applyProgressToNumber(progress: number, a: number, b: number) {
  'worklet';
  return a + progress * (b - a);
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
        animation.reduceMotion = getReduceMotionFromConfig();
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
      finished = finished && result;
      res.push(animation[i].current);
    });

    animation.current = rgbaArrayToRGBAColor(
      toGammaSpace(res as ParsedColorArray)
    );
    return finished;
  };

  const transformationMatrixOnStart = (
    animation: Animation<AnimationObject>,
    value: AffineMatrixFlat,
    timestamp: Timestamp,
    previousAnimation: Animation<AnimationObject>
  ): void => {
    const toValue = animation.toValue as AffineMatrixFlat;

    animation.startMatrices = decomposeMatrixIntoMatricesAndAngles(value);
    animation.stopMatrices = decomposeMatrixIntoMatricesAndAngles(toValue);

    // We create an animation copy to animate single value between 0 and 100
    // We set limits from 0 to 100 (instead of 0-1) to make spring look good
    // with default thresholds.

    animation[0] = Object.assign({}, animationCopy);
    animation[0].current = 0;
    animation[0].toValue = 100;
    animation[0].onStart(
      animation[0],
      0,
      timestamp,
      previousAnimation ? previousAnimation[0] : undefined
    );

    animation.current = value;
  };

  const transformationMatrixOnFrame = (
    animation: Animation<AnimationObject>,
    timestamp: Timestamp
  ): boolean => {
    let finished = true;
    const result = animation[0].onFrame(animation[0], timestamp);
    // We really need to assign this value to result, instead of passing it directly - otherwise once "finished" is false, onFrame won't be called
    finished = finished && result;

    const progress = animation[0].current / 100;

    const transforms = ['translationMatrix', 'scaleMatrix', 'skewMatrix'];
    const mappedTransforms: Array<AffineMatrix> = [];

    transforms.forEach((key, _) =>
      mappedTransforms.push(
        applyProgressToMatrix(
          progress,
          animation.startMatrices[key],
          animation.stopMatrices[key]
        )
      )
    );

    const [currentTranslation, currentScale, skewMatrix] = mappedTransforms;

    const rotations: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
    const mappedRotations: Array<AffineMatrix> = [];

    rotations.forEach((key, _) => {
      const angle = applyProgressToNumber(
        progress,
        animation.startMatrices['r' + key],
        animation.stopMatrices['r' + key]
      );
      mappedRotations.push(getRotationMatrix(angle, key));
    });

    const [rotationMatrixX, rotationMatrixY, rotationMatrixZ] = mappedRotations;

    const rotationMatrix = multiplyMatrices(
      rotationMatrixX,
      multiplyMatrices(rotationMatrixY, rotationMatrixZ)
    );

    const updated = flatten(
      multiplyMatrices(
        multiplyMatrices(
          currentScale,
          multiplyMatrices(skewMatrix, rotationMatrix)
        ),
        currentTranslation
      )
    );

    animation.current = updated;

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
      finished = finished && result;
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
      finished = finished && result;
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
      animation.reduceMotion = getReduceMotionFromConfig();
    }
    if (animation.reduceMotion) {
      if (animation.toValue !== undefined) {
        animation.current = animation.toValue;
      } else {
        // if there is no `toValue`, then the base function is responsible for setting the current value
        baseOnStart(animation, value, timestamp, previousAnimation);
      }
      animation.startTime = 0;
      animation.onFrame = () => true;
      return;
    }
    if (isColor(value)) {
      colorOnStart(animation, value, timestamp, previousAnimation);
      animation.onFrame = colorOnFrame;
      return;
    } else if (isAffineMatrixFlat(value)) {
      transformationMatrixOnStart(
        animation,
        value,
        timestamp,
        previousAnimation
      );
      animation.onFrame = transformationMatrixOnFrame;
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

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

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

  if (_WORKLET || SHOULD_BE_USE_WEB) {
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
