'use strict';
import type { AnimationSettingProp, TransitionSettingProp } from '../types';

const ANIMATION_SETTINGS: AnimationSettingProp[] = [
  'animationDuration',
  'animationTimingFunction',
  'animationDelay',
  'animationIterationCount',
  'animationDirection',
  'animationFillMode',
  'animationPlayState',
];

const TRANSITION_SETTINGS: TransitionSettingProp[] = [
  'transitionProperty',
  'transitionDuration',
  'transitionTimingFunction',
  'transitionDelay',
];

const ANIMATION_SETTINGS_SET = new Set<string>(ANIMATION_SETTINGS);
const TRANSITION_SETTINGS_SET = new Set<string>(TRANSITION_SETTINGS);

export const isAnimationSetting = (key: string): key is AnimationSettingProp =>
  ANIMATION_SETTINGS_SET.has(key);

export const isTransitionSetting = (
  key: string
): key is TransitionSettingProp => TRANSITION_SETTINGS_SET.has(key);

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
