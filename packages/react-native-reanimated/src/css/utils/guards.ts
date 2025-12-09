'use strict';
import { isNumber, isPercentage } from '../../common';
import {
  ANIMATION_PROPS,
  TRANSITION_PROPS,
  VALID_PARAMETRIZED_TIMING_FUNCTIONS,
  VALID_PREDEFINED_TIMING_FUNCTIONS,
  VALID_STEPS_MODIFIERS,
} from '../constants';
import type { PredefinedTimingFunction, StepsModifier } from '../easing/types';
import type {
  CSSAnimationKeyframes,
  CSSAnimationProp,
  CSSKeyframesRule,
  CSSStyleProp,
  CSSTransitionProp,
  Repeat,
  TimeUnit,
} from '../types';

const ANIMATION_PROPS_SET = new Set<string>(ANIMATION_PROPS);
const TRANSITION_PROPS_SET = new Set<string>(TRANSITION_PROPS);
const VALID_STEPS_MODIFIERS_SET = new Set<string>(VALID_STEPS_MODIFIERS);

const VALID_PREDEFINED_TIMING_FUNCTIONS_SET = new Set<string>(
  VALID_PREDEFINED_TIMING_FUNCTIONS
);

const VALID_PARAMETRIZED_TIMING_FUNCTIONS_SET = new Set<string>(
  VALID_PARAMETRIZED_TIMING_FUNCTIONS
);

export const isPredefinedTimingFunction = (
  value: string
): value is PredefinedTimingFunction =>
  VALID_PREDEFINED_TIMING_FUNCTIONS_SET.has(value);

export const smellsLikeTimingFunction = (value: string) =>
  VALID_PREDEFINED_TIMING_FUNCTIONS_SET.has(value) ||
  VALID_PARAMETRIZED_TIMING_FUNCTIONS_SET.has(value.split('(')[0].trim());

export const isAnimationProp = (key: string): key is CSSAnimationProp =>
  ANIMATION_PROPS_SET.has(key);

export const isTransitionProp = (key: string): key is CSSTransitionProp =>
  TRANSITION_PROPS_SET.has(key);

export const isStepsModifier = (value: string): value is StepsModifier =>
  VALID_STEPS_MODIFIERS_SET.has(value);

export const isCSSStyleProp = (key: string): key is CSSStyleProp =>
  isTransitionProp(key) || isAnimationProp(key);

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
