'use strict';
import { CSSKeyframesRuleImpl } from '../models';
import type {
  AnimationSettingProp,
  CSSAnimationKeyframes,
  CSSKeyframesRule,
  TransitionSettingProp,
} from '../types';

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
  'transitionDuration',
  'transitionTimingFunction',
  'transitionDelay',
  'transitionBehavior',
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

export const isCSSKeyframesRule = (value: object): value is CSSKeyframesRule =>
  value instanceof CSSKeyframesRuleImpl;

export const isCSSKeyframesObject = (
  value: object
): value is CSSAnimationKeyframes =>
  typeof value === 'object' && Object.keys(value).length > 0;
