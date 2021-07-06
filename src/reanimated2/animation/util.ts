/* global _WORKLET */
import { isColor, convertToHSVA, toRGBA } from '../Colors';
import NativeReanimated from '../NativeReanimated';
import { Animation, PrimitiveValue, SharedValue } from './commonTypes';

let IN_STYLE_UPDATER = false;

export function initialUpdaterRun(updater) {
  IN_STYLE_UPDATER = true;
  const result = updater();
  IN_STYLE_UPDATER = false;
  return result;
}

export function transform(value: PrimitiveValue, handler): number {
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

export function transformAnimation(animation: Animation) {
  'worklet';
  if (!animation) {
    return;
  }
  animation.toValue = transform(animation.toValue, animation);
  animation.current = transform(animation.current, animation);
  animation.startValue = transform(animation.startValue, animation);
}

export function decorateAnimation(animation: Animation) {
  'worklet';
  if (animation.isHigherOrder) {
    return;
  }
  const baseOnStart = animation.onStart;
  const baseOnFrame = animation.onFrame;
  const animationCopy = Object.assign({}, animation);
  delete animationCopy.callback;

  const prefNumberSuffOnStart = (
    animation: Animation,
    value: PrimitiveValue,
    timestamp: number,
    previousAnimation: Animation
  ) => {
    const val = transform(value, animation);
    transformAnimation(animation);
    if (previousAnimation !== animation) transformAnimation(previousAnimation);

    baseOnStart(animation, val, timestamp, previousAnimation);

    transformAnimation(animation);
    if (previousAnimation !== animation) transformAnimation(previousAnimation);
  };
  const prefNumberSuffOnFrame = (animation: Animation, timestamp: number) => {
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

export function defineAnimation(
  starting: number,
  factory: () => Animation
): Animation {
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

export function cancelAnimation(sharedValue: SharedValue) {
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
