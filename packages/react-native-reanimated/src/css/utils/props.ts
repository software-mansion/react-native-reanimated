'use strict';
import { logger } from 'react-native-worklets';

import { isSharedValue } from '../../isSharedValue';
import type {
  AnyRecord,
  CSSAnimationProperties,
  CSSStyle,
  CSSTransitionProperties,
  ExistingCSSAnimationProperties,
  PlainStyle,
} from '../types';
import {
  isAnimationProp,
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
  const animationProperties: Partial<CSSAnimationProperties> = {};
  let transitionProperties: Partial<CSSTransitionProperties> = {};
  const filteredStyle: AnyRecord = {};

  for (const [prop, value] of Object.entries(style)) {
    if (isAnimationProp(prop)) {
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
  const animationName = animationProperties.animationName;
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

  if (__DEV__) {
    validateCSSAnimationProps(animationProperties);
    validateCSSTransitionProps(transitionProperties);
  }

  return [finalAnimationConfig, finalTransitionConfig, filteredStyle];
}

function validateCSSAnimationProps(props: Partial<CSSAnimationProperties>) {
  const propertyNames = Object.keys(props);

  // Check if any animation properties are present but animationName is missing
  if (propertyNames.length > 0 && !('animationName' in props)) {
    logger.warn(
      'CSS animationName property is missing while other CSS animation properties were provided.\n' +
        'If you wanted to remove the CSS animation, either:\n' +
        '  - Pass animationName: "none" to make it explicit\n' +
        '  - Remove all CSS animation properties from the style'
    );
  }

  // Check if animationName is present but animationDuration is missing
  if (
    'animationName' in props &&
    props.animationName !== 'none' &&
    !('animationDuration' in props)
  ) {
    logger.warn(
      'animationDuration is not specified for CSS animation. The default value is 0s.\n' +
        'Have you forgotten to pass the animationDuration?'
    );
  }
}

function validateCSSTransitionProps(_props: Partial<CSSTransitionProperties>) {}
