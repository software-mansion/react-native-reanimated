'use strict';
import type { AnyRecord, PlainStyle, UnknownRecord } from '../../common';
import { logger } from '../../common';
import { isSharedValue } from '../../isSharedValue';
import type {
  CSSAnimationProperties,
  CSSStyle,
  CSSTransitionProperties,
  ExistingCSSAnimationProperties,
  PropsDiff,
} from '../types';
import { deepEqual } from './equality';
import {
  isAnimationProp,
  isCSSKeyframesObject,
  isCSSKeyframesRule,
  isTransitionProp,
} from './guards';

/**
 * Calculates the difference between old and new props. Returns an object where
 * each key is a changed property and the value is [oldValue, newValue]. When
 * allowedProperties changes, removed properties are marked with null.
 *
 * @param previousAllowedProperties - Previous list of allowed properties to
 *   detect removed properties
 */
export function getChangedProps(
  oldProps: UnknownRecord,
  newProps: UnknownRecord,
  allowedProperties?: Set<string>,
  previousAllowedProperties?: Set<string>
): PropsDiff {
  const diff: PropsDiff = {};

  if (!allowedProperties) {
    // Fast path - no need to check allowed properties
    for (const key in oldProps) {
      const oldValue = oldProps[key];
      const newValue = newProps[key];
      if (!deepEqual(oldValue, newValue)) {
        diff[key] = [oldValue, newValue];
      }
    }
    for (const key in newProps) {
      if (!(key in oldProps)) {
        diff[key] = [undefined, newProps[key]];
      }
    }
    return diff;
  }

  // Slow path - check allowed properties
  const oldKeys = Object.keys(oldProps);
  const newKeys = Object.keys(newProps);
  const keysToCheck = new Set(oldKeys.concat(newKeys));

  for (const key of keysToCheck) {
    if (allowedProperties.has(key)) {
      const oldValue = oldProps[key];
      const newValue = newProps[key];
      if (!deepEqual(oldValue, newValue)) {
        diff[key] = [oldValue, newValue];
      }
    } else if (
      !previousAllowedProperties ||
      previousAllowedProperties.has(key)
    ) {
      diff[key] = null;
    }
  }

  if (previousAllowedProperties) {
    for (const key of previousAllowedProperties) {
      if (!keysToCheck.has(key) && !allowedProperties.has(key)) {
        diff[key] = null;
      }
    }
  }

  return diff;
}

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
  // Check if animationDuration is missing when animationName is present
  if (!('animationDuration' in props) && 'animationName' in props) {
    logger.warn(
      'animationDuration was not specified for CSS animation. The default duration is 0s.\n' +
        'Have you forgotten to pass the animationDuration?'
    );
  }
}

function validateCSSTransitionProps(props: Partial<CSSTransitionProperties>) {
  // Check if transitionDuration is missing when transitionProperty is present
  if (!('transitionDuration' in props) && 'transitionProperty' in props) {
    logger.warn(
      'transitionDuration was not specified for CSS transition. The default duration is 0s.\n' +
        'Have you forgotten to pass the transitionDuration?'
    );
  }
}
