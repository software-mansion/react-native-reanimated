'use strict';
import type {
  AnyRecord,
  CSSAnimationProperties,
  CSSStyle,
  CSSTransitionProperties,
  ExistingCSSAnimationProperties,
  PlainStyle,
} from '../types';
import {
  isAnimationSetting,
  isCSSKeyframesObject,
  isCSSKeyframesRule,
  isTransitionProp,
} from './guards';

export function filterCSSAndStyleProperties<S extends AnyRecord>(
  style: CSSStyle<S>
): [
  ExistingCSSAnimationProperties | null,
  CSSTransitionProperties | null,
  PlainStyle,
] {
  let animationName: CSSAnimationProperties['animationName'] | null = null;
  const animationProperties: Partial<CSSAnimationProperties> = {};
  const transitionProperties: Partial<CSSTransitionProperties> = {};
  const filteredStyle: AnyRecord = {};

  for (const [prop, value] of Object.entries(style)) {
    if (prop === 'animationName') {
      animationName = value as CSSAnimationProperties['animationName'];
    } else if (isAnimationSetting(prop)) {
      animationProperties[prop] = value;
    } else if (isTransitionProp(prop)) {
      transitionProperties[prop] = value;
    } else {
      filteredStyle[prop] = value;
    }
  }

  // Return animationProperties only if at least one animationName contains
  // valid keyframes
  const hasAnimationName =
    animationName &&
    (Array.isArray(animationName) ? animationName : [animationName]).every(
      (keyframes) =>
        keyframes === 'none'
          ? false
          : isCSSKeyframesRule(keyframes) || isCSSKeyframesObject(keyframes)
    );
  const finalAnimationConfig = hasAnimationName
    ? ({
        ...animationProperties,
        animationName,
      } as ExistingCSSAnimationProperties)
    : null;

  // Return transitionProperties only if the transitionProperty is present
  const hasTransitionConfig = Object.keys(transitionProperties).length > 0;
  const finalTransitionConfig = hasTransitionConfig
    ? transitionProperties
    : null;

  return [finalAnimationConfig, finalTransitionConfig, filteredStyle];
}
