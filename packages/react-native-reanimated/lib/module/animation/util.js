/* eslint-disable @typescript-eslint/no-shadow */
'use strict';

import { createSerializable, isWorkletFunction, runOnUI, RuntimeKind, serializableMappingCache } from 'react-native-worklets';
import { clampRGBA, convertToRGBA, isColor, rgbaArrayToRGBAColor, toGammaSpace, toLinearSpace } from "../Colors.js";
import { logger, ReanimatedError, SHOULD_BE_USE_WEB } from "../common/index.js";
import { ReduceMotion } from "../commonTypes.js";
import { ReducedMotionManager } from "../ReducedMotion.js";
import { addMatrices, decomposeMatrixIntoMatricesAndAngles, flatten, getRotationMatrix, isAffineMatrixFlat, multiplyMatrices, scaleMatrix, subtractMatrices } from "./transformationMatrix/matrixUtils.js";

/**
 * This variable has to be an object, because it can't be changed for the
 * worklets if it's a primitive value. We also have to bind it to a separate
 * object to prevent from freezing it in development.
 */
const IN_STYLE_UPDATER = {
  current: false
};
const IN_STYLE_UPDATER_UI = createSerializable({
  current: false
});
serializableMappingCache.set(IN_STYLE_UPDATER, IN_STYLE_UPDATER_UI);
const LAYOUT_ANIMATION_SUPPORTED_PROPS = {
  originX: true,
  originY: true,
  width: true,
  height: true,
  borderRadius: true,
  globalOriginX: true,
  globalOriginY: true,
  opacity: true,
  transform: true,
  backgroundColor: true
};
export function isValidLayoutAnimationProp(prop) {
  'worklet';

  return prop in LAYOUT_ANIMATION_SUPPORTED_PROPS;
}
if (__DEV__ && ReducedMotionManager.jsValue) {
  logger.warn(`Reduced motion setting is enabled on this device. This warning is visible only in the development mode. Some animations will be disabled by default. You can override the behavior for individual animations, see https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#reduced-motion-setting-is-enabled-on-this-device.`);
}
export function assertEasingIsWorklet(easing) {
  'worklet';

  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    // If this is called on UI (for example from gesture handler with worklets), we don't get easing,
    // but its bound copy, which is not a worklet. We don't want to throw any error then.
    return;
  }
  if (SHOULD_BE_USE_WEB) {
    // It is possible to run reanimated on web without plugin, so let's skip this check on web
    return;
  }
  // @ts-ignore typescript wants us to use `in` instead, which doesn't work with host objects
  if (easing?.factory) {
    return;
  }
  if (!isWorkletFunction(easing)) {
    throw new ReanimatedError('The easing function is not a worklet. Please make sure you import `Easing` from react-native-reanimated.');
  }
}
export function initialUpdaterRun(updater) {
  IN_STYLE_UPDATER.current = true;
  const result = updater();
  IN_STYLE_UPDATER.current = false;
  return result;
}
export function recognizePrefixSuffix(value) {
  'worklet';

  if (typeof value === 'string') {
    const match = value.match(/([A-Za-z]*)(-?\d*\.?\d*)([eE][-+]?[0-9]+)?([A-Za-z%]*)/);
    if (!match) {
      throw new ReanimatedError("Couldn't parse animation value.");
    }
    const prefix = match[1];
    const suffix = match[4];
    // number with scientific notation
    const number = match[2] + (match[3] ?? '');
    return {
      prefix,
      suffix,
      strippedValue: parseFloat(number)
    };
  } else {
    return {
      strippedValue: value
    };
  }
}

/**
 * Returns whether the motion should be reduced for a specified config. By
 * default returns the system setting.
 */
const isReduceMotionOnUI = ReducedMotionManager.uiValue;
export function getReduceMotionFromConfig(config) {
  'worklet';

  return !config || config === ReduceMotion.System ? isReduceMotionOnUI.value : config === ReduceMotion.Always;
}

/**
 * Returns the value that should be assigned to `animation.reduceMotion` for a
 * given config. If the config is not defined, `undefined` is returned.
 */
export function getReduceMotionForAnimation(config) {
  'worklet';

  // if the config is not defined, we want `reduceMotion` to be undefined,
  // so the parent animation knows if it should overwrite it
  if (!config) {
    return undefined;
  }
  return getReduceMotionFromConfig(config);
}
function applyProgressToMatrix(progress, a, b) {
  'worklet';

  return addMatrices(a, scaleMatrix(subtractMatrices(b, a), progress));
}
function applyProgressToNumber(progress, a, b) {
  'worklet';

  return a + progress * (b - a);
}
function decorateAnimation(animation) {
  'worklet';

  const baseOnStart = animation.onStart;
  const baseOnFrame = animation.onFrame;
  if (animation.isHigherOrder) {
    animation.onStart = (animation, value, timestamp, previousAnimation) => {
      if (animation.reduceMotion === undefined) {
        animation.reduceMotion = getReduceMotionFromConfig();
      }
      return baseOnStart(animation, value, timestamp, previousAnimation);
    };
    return;
  }
  const animationCopy = Object.assign({}, animation);
  delete animationCopy.callback;
  const prefNumberSuffOnStart = (animation, value, timestamp, previousAnimation) => {
    // recognize prefix, suffix, and updates stripped value on animation start
    const {
      prefix,
      suffix,
      strippedValue
    } = recognizePrefixSuffix(value);
    animation.__prefix = prefix;
    animation.__suffix = suffix;
    animation.strippedCurrent = strippedValue;
    const {
      strippedValue: strippedToValue
    } = recognizePrefixSuffix(animation.toValue);
    animation.current = strippedValue;
    animation.startValue = strippedValue;
    animation.toValue = strippedToValue;
    if (previousAnimation && previousAnimation !== animation) {
      const {
        prefix: paPrefix,
        suffix: paSuffix,
        strippedValue: paStrippedValue
      } = recognizePrefixSuffix(previousAnimation.current);
      previousAnimation.current = paStrippedValue;
      previousAnimation.__prefix = paPrefix;
      previousAnimation.__suffix = paSuffix;
    }
    baseOnStart(animation, strippedValue, timestamp, previousAnimation);
    animation.current = (animation.__prefix ?? '') + animation.current + (animation.__suffix ?? '');
    if (previousAnimation && previousAnimation !== animation) {
      previousAnimation.current = (previousAnimation.__prefix ?? '') +
      // FIXME
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-base-to-string
      previousAnimation.current + (previousAnimation.__suffix ?? '');
    }
  };
  const prefNumberSuffOnFrame = (animation, timestamp) => {
    animation.current = animation.strippedCurrent;
    const res = baseOnFrame(animation, timestamp);
    animation.strippedCurrent = animation.current;
    animation.current = (animation.__prefix ?? '') + animation.current + (animation.__suffix ?? '');
    return res;
  };
  const tab = ['R', 'G', 'B', 'A'];
  const colorOnStart = (animation, value, timestamp, previousAnimation) => {
    let RGBAValue;
    let RGBACurrent;
    let RGBAToValue;
    const res = [];
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
      animation[i].onStart(animation[i], RGBAValue[index], timestamp, previousAnimation ? previousAnimation[i] : undefined);
      res.push(animation[i].current);
    });
    animation.unroundedCurrent = res;

    // We need to clamp the res values to make sure they are in the correct RGBA range
    clampRGBA(res);
    animation.current = rgbaArrayToRGBAColor(toGammaSpace(res));
  };
  const colorOnFrame = (animation, timestamp) => {
    const res = [];
    let finished = true;
    // We must restore nonscale current to ever end the animation.
    animation.current = animation.nonscaledCurrent;
    tab.forEach(i => {
      const result = animation[i].onFrame(animation[i], timestamp);
      // We really need to assign this value to result, instead of passing it directly - otherwise once "finished" is false, onFrame won't be called
      finished = finished && result;
      res.push(animation[i].current);
    });

    // We need to clamp the res values to make sure they are in the correct RGBA range
    clampRGBA(res);
    animation.nonscaledCurrent = res;
    animation.current = rgbaArrayToRGBAColor(toGammaSpace(res));
    return finished;
  };
  const transformationMatrixOnStart = (animation, value, timestamp, previousAnimation) => {
    const toValue = animation.toValue;
    animation.startMatrices = decomposeMatrixIntoMatricesAndAngles(value);
    animation.stopMatrices = decomposeMatrixIntoMatricesAndAngles(toValue);

    // We create an animation copy to animate single value between 0 and 100
    // We set limits from 0 to 100 (instead of 0-1) to make spring look good
    // with default thresholds.

    animation[0] = Object.assign({}, animationCopy);
    animation[0].current = 0;
    animation[0].toValue = 100;
    animation[0].onStart(animation[0], 0, timestamp, previousAnimation ? previousAnimation[0] : undefined);
    animation.current = value;
  };
  const transformationMatrixOnFrame = (animation, timestamp) => {
    let finished = true;
    const result = animation[0].onFrame(animation[0], timestamp);
    // We really need to assign this value to result, instead of passing it directly - otherwise once "finished" is false, onFrame won't be called
    finished = finished && result;
    const progress = animation[0].current / 100;
    const transforms = ['translationMatrix', 'scaleMatrix', 'skewMatrix'];
    const mappedTransforms = [];
    transforms.forEach((key, _) => mappedTransforms.push(applyProgressToMatrix(progress, animation.startMatrices[key], animation.stopMatrices[key])));
    const [currentTranslation, currentScale, skewMatrix] = mappedTransforms;
    const rotations = ['x', 'y', 'z'];
    const mappedRotations = [];
    rotations.forEach((key, _) => {
      const angle = applyProgressToNumber(progress, animation.startMatrices['r' + key], animation.stopMatrices['r' + key]);
      mappedRotations.push(getRotationMatrix(angle, key));
    });
    const [rotationMatrixX, rotationMatrixY, rotationMatrixZ] = mappedRotations;
    const rotationMatrix = multiplyMatrices(rotationMatrixX, multiplyMatrices(rotationMatrixY, rotationMatrixZ));
    const updated = flatten(multiplyMatrices(multiplyMatrices(currentScale, multiplyMatrices(skewMatrix, rotationMatrix)), currentTranslation));
    animation.current = updated;
    return finished;
  };
  const arrayOnStart = (animation, value, timestamp, previousAnimation) => {
    value.forEach((v, i) => {
      animation[i] = Object.assign({}, animationCopy);
      animation[i].current = v;
      animation[i].toValue = animation.toValue[i];
      animation[i].onStart(animation[i], v, timestamp, previousAnimation ? previousAnimation[i] : undefined);
    });
    animation.current = [...value];
  };
  const arrayOnFrame = (animation, timestamp) => {
    let finished = true;
    animation.current.forEach((_, i) => {
      const result = animation[i].onFrame(animation[i], timestamp);
      // We really need to assign this value to result, instead of passing it directly - otherwise once "finished" is false, onFrame won't be called
      finished = finished && result;
      animation.current[i] = animation[i].current;
    });
    return finished;
  };
  const objectOnStart = (animation, value, timestamp, previousAnimation) => {
    for (const key in value) {
      animation[key] = Object.assign({}, animationCopy);
      animation[key].onStart = animation.onStart;
      animation[key].current = value[key];
      animation[key].toValue = animation.toValue[key];
      animation[key].onStart(animation[key], value[key], timestamp, previousAnimation ? previousAnimation[key] : undefined);
    }
    animation.current = value;
  };
  const objectOnFrame = (animation, timestamp) => {
    let finished = true;
    const newObject = {};
    for (const key in animation.current) {
      const result = animation[key].onFrame(animation[key], timestamp);
      // We really need to assign this value to result, instead of passing it directly - otherwise once "finished" is false, onFrame won't be called
      finished = finished && result;
      newObject[key] = animation[key].current;
    }
    animation.current = newObject;
    return finished;
  };
  animation.onStart = (animation, value, timestamp, previousAnimation) => {
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
      transformationMatrixOnStart(animation, value, timestamp, previousAnimation);
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
export function defineAnimation(starting, factory) {
  'worklet';

  if (globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative && IN_STYLE_UPDATER.current) {
    return starting;
  }
  const create = () => {
    'worklet';

    const animation = factory();
    decorateAnimation(animation);
    return animation;
  };
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative || SHOULD_BE_USE_WEB) {
    return create();
  }
  create.__isAnimationDefinition = true;

  // @ts-expect-error it's fine
  return create;
}
function cancelAnimationNative(sharedValue) {
  'worklet';

  // setting the current value cancels the animation if one is currently running
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
  } else {
    runOnUI(() => {
      'worklet';

      sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
    })();
  }
}
function cancelAnimationWeb(sharedValue) {
  // setting the current value cancels the animation if one is currently running
  sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
}

/**
 * Lets you cancel a running animation paired to a shared value. The
 * cancellation is asynchronous.
 *
 * @param sharedValue - The shared value of a running animation that you want to
 *   cancel.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/cancelAnimation
 */
export const cancelAnimation = SHOULD_BE_USE_WEB ? cancelAnimationWeb : cancelAnimationNative;
//# sourceMappingURL=util.js.map