/* global _WORKLET */
import { isColor, convertToHSVA, toRGBA, ParsedColorArray } from '../Colors';
import NativeReanimated from '../NativeReanimated';
import {
  Animation,
  PrimitiveValue,
  SharedValue,
  NextAnimation,
  Timestamp,
  AnimationObject,
  HigherOrderAnimation,
} from './commonTypes';
import { AnimatedStyle } from '../commonTypes';
import { StyleLayoutAnimation } from './styleAnimation';
import { DelayAnimation } from './delay';
import { RepeatAnimation } from './repeat';
import { SequenceAnimation } from './sequence';

let IN_STYLE_UPDATER = false;

export type UserUpdater = () => AnimatedStyle;

export function initialUpdaterRun(updater: UserUpdater): AnimatedStyle {
  IN_STYLE_UPDATER = true;
  const result = updater();
  IN_STYLE_UPDATER = false;
  return result;
}

export function transform(
  value: PrimitiveValue,
  handler: AnimationObject
): PrimitiveValue {
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

export function transformAnimation(animation: AnimationObject): void {
  'worklet';
  if (!animation) {
    return;
  }
  animation.toValue = transform(animation.toValue, animation);
  animation.current = transform(animation.current, animation);
  animation.startValue = transform(animation.startValue, animation);
}

export function decorateAnimation<
  T extends AnimationObject | StyleLayoutAnimation
>(animation: T): void {
  'worklet';
  if ((animation as HigherOrderAnimation).isHigherOrder) {
    return;
  }

  const baseOnStart = (animation as Animation<AnimationObject>).onStart;
  const baseOnFrame = (animation as Animation<AnimationObject>).onFrame;
  const animationCopy = Object.assign({}, animation);
  delete animationCopy.callback;

  const prefNumberSuffOnStart = (
    animation: Animation<AnimationObject>,
    value: PrimitiveValue,
    timestamp: number,
    previousAnimation: Animation<AnimationObject>
  ) => {
    const val = transform(value, animation);
    transformAnimation(animation);
    if (previousAnimation !== animation) transformAnimation(previousAnimation);

    baseOnStart(animation, val, timestamp, previousAnimation);

    transformAnimation(animation);
    if (previousAnimation !== animation) transformAnimation(previousAnimation);
  };
  const prefNumberSuffOnFrame = (
    animation: Animation<AnimationObject>,
    timestamp: number
  ) => {
    transformAnimation(animation);

    const res = baseOnFrame(animation, timestamp);

    transformAnimation(animation);
    return res;
  };

  const tab = ['H', 'S', 'V', 'A'];
  const colorOnStart = (
    animation: Animation<AnimationObject>,
    value: string | number,
    timestamp: Timestamp,
    previousAnimation: Animation<AnimationObject>
  ): void => {
    let HSVAValue: ParsedColorArray;
    let HSVACurrent: ParsedColorArray;
    let HSVAToValue: ParsedColorArray;
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

    animation.current = toRGBA(res as ParsedColorArray);
  };

  const colorOnFrame = (
    animation: Animation<AnimationObject>,
    timestamp: Timestamp
  ): boolean => {
    // TODO
    const HSVACurrent = convertToHSVA(animation.current);
    const res = [];
    let finished = true;
    tab.forEach((i, index) => {
      animation[i].current = HSVACurrent[index];
      // @ts-ignore: disable-next-line
      finished &= animation[i].onFrame(animation[i], timestamp);
      res.push(animation[i].current);
    });

    animation.current = toRGBA(res as ParsedColorArray);
    return finished;
  };

  animation.onStart = (
    animation: Animation<AnimationObject>,
    value: number,
    timestamp: Timestamp,
    previousAnimation: Animation<AnimationObject>
  ) => {
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

type ConditionalyStarting<
  T extends AnimationObject | StyleLayoutAnimation
> = T extends StyleLayoutAnimation
  ? Record<string, unknown>
  : T extends DelayAnimation
  ? NextAnimation<DelayAnimation>
  : T extends RepeatAnimation
  ? NextAnimation<RepeatAnimation>
  : T extends SequenceAnimation
  ? NextAnimation<SequenceAnimation>
  : PrimitiveValue | T;

export function defineAnimation<
  T extends AnimationObject | StyleLayoutAnimation
>(starting: ConditionalyStarting<T>, factory: () => T): T {
  'worklet';
  if (IN_STYLE_UPDATER) {
    return starting as T;
  }
  const create = () => {
    'worklet';
    const animation = factory();
    decorateAnimation<T>(animation);
    return animation;
  };

  if (_WORKLET || !NativeReanimated.native) {
    return create();
  }
  // @ts-ignore: eslint-disable-line
  return create;
}

export function cancelAnimation(sharedValue: SharedValue): void {
  'worklet';
  // setting the current value cancels the animation if one is currently running
  sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
}

// TODO it should work only if there was no animation before.
export function withStartValue(
  startValue: PrimitiveValue,
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
