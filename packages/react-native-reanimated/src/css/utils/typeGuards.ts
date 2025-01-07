'use strict';
import type {
  CSSAnimationSettingProp,
  CSSAnimationKeyframes,
  CSSTransitionProp,
} from '../types';

const ANIMATION_SETTINGS: CSSAnimationSettingProp[] = [
  'animationDuration',
  'animationTimingFunction',
  'animationDelay',
  'animationIterationCount',
  'animationDirection',
  'animationFillMode',
  'animationPlayState',
];

const TRANSITION_PROPS: CSSTransitionProp[] = [
  'transitionProperty',
  'transitionDuration',
  'transitionTimingFunction',
  'transitionDelay',
  'transitionBehavior',
];

const ANIMATION_SETTINGS_SET = new Set<string>(ANIMATION_SETTINGS);
const TRANSITION_PROPS_SET = new Set<string>(TRANSITION_PROPS);

export const isAnimationSetting = (
  key: string
): key is CSSAnimationSettingProp => ANIMATION_SETTINGS_SET.has(key);

export const isTransitionProp = (key: string): key is CSSTransitionProp =>
  TRANSITION_PROPS_SET.has(key);

export const isTransformString = (
  prop: string,
  value: unknown
): value is string => prop === 'transform' && typeof value === 'string';

export const isColorProp = (prop: string, value: unknown): boolean =>
  prop.toLowerCase().includes('color') &&
  (typeof value === 'string' || typeof value === 'number');

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !isNaN(value);

export const isPercentage = (value: string | number): value is `${number}%` => {
  return typeof value === 'string' && /^-?\d+(\.\d+)?%$/.test(value);
};

export const isAngleValue = (
  value: string | number
): value is `${number}deg` | `${number}rad` => {
  return typeof value === 'string' && /^-?\d+(\.\d+)?(deg|rad)$/.test(value);
};

export const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isNumber);

export const isCSSKeyframesObject = (
  value: object
): value is CSSAnimationKeyframes =>
  typeof value === 'object' && Object.keys(value).length > 0;
