'use strict';
import type {
  CSSAnimationSettingProp,
  CSSAnimationKeyframes,
  CSSTransitionProp,
  CSSKeyframesRule,
  AnyRecord,
} from '../types';
import type { ConfigPropertyAlias } from '../types/config';

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

export const isDefined = <T>(value: T): value is NonNullable<T> =>
  value !== undefined && value !== null;

export const isRecord = <T extends AnyRecord = AnyRecord>(
  value: unknown
): value is T =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isNumber);

export const isCSSKeyframesObject = (
  value: object
): value is CSSAnimationKeyframes =>
  typeof value === 'object' && Object.keys(value).length > 0;

export const isCSSKeyframesRule = (value: object): value is CSSKeyframesRule =>
  typeof value === 'object' && 'cssRules' in value && 'cssText' in value;

export const isConfigPropertyAlias = <P extends AnyRecord>(
  value: unknown
): value is ConfigPropertyAlias<P> =>
  !!value &&
  typeof value === 'object' &&
  'as' in value &&
  typeof value.as === 'string';
