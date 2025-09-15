'use strict';

import { logger } from '../../common';
import { isSharedValue } from '../../isSharedValue';
import { isAnimationProp, isCSSKeyframesObject, isCSSKeyframesRule, isTransitionProp } from './guards';
export function filterCSSAndStyleProperties(style) {
  const animationProperties = {};
  let transitionProperties = {};
  const filteredStyle = {};
  for (const [prop, value] of Object.entries(style)) {
    if (isAnimationProp(prop)) {
      // TODO - add support for animation shorthand
      animationProperties[prop] = value;
    } else if (isTransitionProp(prop)) {
      // If there is a shorthand `transition` property, all properties specified
      // before are ignored and only these specified later are taken into account
      // and override ones from the shorthand
      if (prop === 'transition') {
        transitionProperties = {
          transition: value
        };
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
  const hasAnimationName = animationName && (Array.isArray(animationName) ? animationName : [animationName]).every(keyframes => keyframes === 'none' ? false : isCSSKeyframesRule(keyframes) || isCSSKeyframesObject(keyframes));
  const finalAnimationConfig = hasAnimationName ? {
    ...animationProperties,
    animationName
  } : null;

  // Return transitionProperties only if the transitionProperty is present
  const hasTransitionConfig = Object.keys(transitionProperties).length > 0;
  const finalTransitionConfig = hasTransitionConfig ? transitionProperties : null;
  if (__DEV__) {
    validateCSSAnimationProps(animationProperties);
    validateCSSTransitionProps(transitionProperties);
  }
  return [finalAnimationConfig, finalTransitionConfig, filteredStyle];
}
function validateCSSAnimationProps(props) {
  // Check if any animation properties are present but animationName is missing
  if (!('animationName' in props) && Object.keys(props).length > 0) {
    logger.warn('CSS animation properties were provided without specifying animationName.\n' + 'If unintended, add animationName or remove unnecessary animation properties.');
  }

  // Check if animationDuration is missing when animationName is present
  if (!('animationDuration' in props) && 'animationName' in props) {
    logger.warn('animationDuration was not specified for CSS animation. The default duration is 0s.\n' + 'Have you forgotten to pass the animationDuration?');
  }
}
function validateCSSTransitionProps(props) {
  // Check if transitionDuration is missing when transitionProperty is present
  if (!('transitionDuration' in props) && 'transitionProperty' in props) {
    logger.warn('transitionDuration was not specified for CSS transition. The default duration is 0s.\n' + 'Have you forgotten to pass the transitionDuration?');
  }
}
//# sourceMappingURL=props.js.map