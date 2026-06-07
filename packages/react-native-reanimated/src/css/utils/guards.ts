'use strict';
import { isNumber, isPercentage } from '../../common';
import {
  VALID_PARAMETRIZED_TIMING_FUNCTIONS,
  VALID_PREDEFINED_TIMING_FUNCTIONS,
} from '../constants';
import type { PredefinedTimingFunction, StepsModifier } from '../easing/types';
import type {
  CSSAnimationKeyframes,
  CSSAnimationProp,
  CSSConfigProp,
  CSSKeyframesRule,
  CSSTransitionCallbackProp,
  CSSTransitionProp,
  Repeat,
  TimeUnit,
} from '../types';

export const isPredefinedTimingFunction = (
  value: string
): value is PredefinedTimingFunction =>
  (VALID_PREDEFINED_TIMING_FUNCTIONS as readonly string[]).includes(value);

export const smellsLikeTimingFunction = (value: string) =>
  isPredefinedTimingFunction(value) ||
  VALID_PARAMETRIZED_TIMING_FUNCTIONS.includes(value.split('(')[0].trim());

export const isAnimationProp = (key: string): key is CSSAnimationProp => {
  switch (key) {
    case 'animationName':
    case 'animationDuration':
    case 'animationTimingFunction':
    case 'animationDelay':
    case 'animationIterationCount':
    case 'animationDirection':
    case 'animationFillMode':
    case 'animationPlayState':
      return true;
    default:
      return false;
  }
};

export const isTransitionProp = (key: string): key is CSSTransitionProp => {
  switch (key) {
    case 'transitionProperty':
    case 'transitionDuration':
    case 'transitionTimingFunction':
    case 'transitionDelay':
    case 'transitionBehavior':
    case 'transition':
      return true;
    default:
      return false;
  }
};

export const isTransitionCallbackProp = (
  key: string
): key is CSSTransitionCallbackProp => {
  switch (key) {
    case 'onTransitionRun':
    case 'onTransitionStart':
    case 'onTransitionEnd':
    case 'onTransitionCancel':
      return true;
    default:
      return false;
  }
};

export const isStepsModifier = (value: string): value is StepsModifier => {
  switch (value) {
    case 'jump-start':
    case 'start':
    case 'jump-end':
    case 'end':
    case 'jump-none':
    case 'jump-both':
      return true;
    default:
      return false;
  }
};

export const isCSSConfigProp = (key: string): key is CSSConfigProp =>
  isTransitionProp(key) ||
  isAnimationProp(key) ||
  isTransitionCallbackProp(key);

export const isTimeUnit = (value: unknown): value is TimeUnit =>
  // TODO: implement more strict check
  typeof value === 'string' &&
  (/^-?(\d+)?(\.\d+)?(ms|s)$/.test(value) || value === '0');

export const isLength = (value: unknown): value is `${number}%` | number =>
  isNumber(value) || isPercentage(value);

export const isArrayOfLength = <T, L extends number>(
  value: T[],
  length: L
): value is Repeat<T, L> => Array.isArray(value) && value.length === length;

export const isCSSKeyframesObject = (
  value: object
): value is CSSAnimationKeyframes =>
  typeof value === 'object' && Object.keys(value).length > 0;

export const isCSSKeyframesRule = (value: object): value is CSSKeyframesRule =>
  typeof value === 'object' && 'cssRules' in value && 'cssText' in value;

export const isPseudoSelectorValue = (
  value: unknown
): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return false;
  }
  return keys.every((key) => key === 'default' || key.startsWith(':'));
};
