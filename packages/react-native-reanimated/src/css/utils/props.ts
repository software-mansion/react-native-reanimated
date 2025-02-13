'use strict';
import { isSharedValue } from '../../isSharedValue';
import type {
  AnyRecord,
  CSSAnimationProperties,
  CSSStyle,
  CSSTransitionProperties,
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
): [CSSAnimationProperties | null, CSSTransitionProperties | null, PlainStyle] {
  let animationName: CSSAnimationProperties['animationName'] | null = null;
  const animationProperties: CSSAnimationProperties = {};
  let transitionProperties: CSSTransitionProperties = {};
  const filteredStyle: AnyRecord = {};

  for (const [prop, value] of Object.entries(style)) {
    if (prop === 'animationName') {
      animationName = value as CSSAnimationProperties['animationName'];
    } else if (isAnimationSetting(prop)) {
      // TODO - add support for animation shorthand
      animationProperties[prop] = value;
    } else if (isTransitionProp(prop)) {
      // If there is a shorthand `transition` property, all properties specified
      // before are ignored and only these specified later are taken into account
      // and override ones from the shorthand
      if (prop === 'transition') {
        transitionProperties = { transition: value };
      } else {
        transitionProperties[prop] = value;
      }
    } else if (!isSharedValue(value)) {
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
      } as CSSAnimationProperties)
    : null;

  // Return transitionProperties only if the transitionProperty is present
  const hasTransitionConfig = Object.keys(transitionProperties).length > 0;
  const finalTransitionConfig = hasTransitionConfig
    ? transitionProperties
    : null;

  return [finalAnimationConfig, finalTransitionConfig, filteredStyle];
}
