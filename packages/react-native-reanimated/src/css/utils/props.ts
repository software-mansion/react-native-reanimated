'use strict';
import type { AnyRecord, PlainStyle } from '../../common';
import { logger } from '../../common';
import type { StyleProps } from '../../commonTypes';
import { isSharedValue } from '../../isSharedValue';
import type {
  CSSAnimationProperties,
  CSSStyle,
  CSSTransitionProperties,
  ExistingCSSAnimationProperties,
} from '../types';
import { deepEqual } from './equality';
import {
  isAnimationProp,
  isCSSKeyframesObject,
  isCSSKeyframesRule,
  isTransitionProp,
} from './guards';

type PropsDiff = {
  [key: string]: [unknown, unknown]; // [oldValue, newValue]
};

/**
 * Calculates the difference between old and new props. Returns an object where
 * each key is a changed property and the value is [oldValue, newValue]. When
 * oldProps is null, all newProps are considered changes from undefined. When
 * newProps is null, all oldProps are considered removals.
 *
 * @param allowedProperties - Optional list of properties to check. If provided,
 *   only these properties are diffed.
 */
export function getChangedProps(
  oldProps: StyleProps | null,
  newProps: StyleProps | null,
  allowedProperties?: string[] | null
): PropsDiff {
  const diff: PropsDiff = {};

  if (oldProps === null && newProps === null) {
    return diff;
  }

  // Determine which properties to check
  const propsToCheck = allowedProperties || [
    ...new Set([
      ...Object.keys(oldProps ?? {}),
      ...Object.keys(newProps ?? {}),
    ]),
  ];

  if (oldProps === null && newProps !== null) {
    // All properties in newProps are new (from undefined to value)
    for (const key of propsToCheck) {
      if (key in newProps) {
        diff[key] = [undefined, newProps[key]];
      }
    }
    return diff;
  }

  if (oldProps !== null && newProps === null) {
    // All properties in oldProps are removed (from value to undefined)
    for (const key of propsToCheck) {
      if (key in oldProps) {
        diff[key] = [oldProps[key], undefined];
      }
    }
    return diff;
  }

  // Both oldProps and newProps are not null
  for (const key of propsToCheck) {
    const oldValue = oldProps![key];
    const newValue = newProps![key];

    // Use deep comparison for complex values
    if (!deepEqual(oldValue, newValue)) {
      diff[key] = [oldValue, newValue];
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
