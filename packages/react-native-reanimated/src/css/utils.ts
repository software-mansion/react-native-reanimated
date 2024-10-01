'use strict';
import { processCSSAnimationColor } from '../Colors';
import type { StyleProps } from '../commonTypes';
import type {
  CSSAnimationConfig,
  CSSAnimationKeyframes,
  CSSAnimationSettings,
  CSSTransitionConfig,
  CSSTransitionProperty,
  TransformsArray,
} from './types';

type AnimationSettingProp = keyof CSSAnimationSettings;
type TransitionSettingProp = keyof CSSTransitionConfig;

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

const isAnimationSetting = (key: string): key is AnimationSettingProp =>
  ANIMATION_SETTINGS_SET.has(key);
const isTransitionSetting = (key: string): key is TransitionSettingProp =>
  TRANSITION_SETTINGS_SET.has(key);
const isTransformString = (prop: string, value: unknown): value is string =>
  prop === 'transform' && typeof value === 'string';

export const isColorProp = (prop: string, value: unknown): boolean =>
  prop.toLowerCase().includes('color') &&
  (typeof value === 'string' || typeof value === 'number');

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !isNaN(value);

export function parseTransformString(transformString: string): TransformsArray {
  return transformString
    .split(/\)\s*/)
    .filter(Boolean)
    .map((transform) => {
      const [key, valueString] = transform.split(/\(\s*/);
      const values = valueString
        .replace(/\)$/g, '')
        .split(',')
        .map((value) => {
          const trimmedValue = value.trim();
          if (key.startsWith('translate')) {
            return parseFloat(trimmedValue);
          }
          if (trimmedValue.endsWith('deg') || trimmedValue.endsWith('rad')) {
            return trimmedValue;
          }
          return isNaN(+trimmedValue) ? trimmedValue : +trimmedValue;
        });

      const unwrappedValue = values.length === 1 ? values[0] : values;

      switch (key) {
        case 'translate':
          return {
            translateX: values[0] || 0,
            translateY: values[1] || 0,
          };
        case 'translateX':
        case 'translateY':
          return { [key]: unwrappedValue };
        case 'scale':
          return values.length === 1
            ? { scale: unwrappedValue }
            : { scaleX: values[0] || 1, scaleY: values[1] || values[0] || 1 };
        case 'rotate':
        case 'rotateX':
        case 'rotateY':
        case 'rotateZ':
          return { [key]: unwrappedValue };
        case 'skew':
          return {
            skewX: values[0] || '0deg',
            skewY: values[1] || '0deg',
          };
        default:
          return { [key]: unwrappedValue };
      }
    }) as TransformsArray;
}

export function extractCSSConfigsAndFlattenedStyles(
  styles: StyleProps[]
): [CSSAnimationConfig | null, CSSTransitionConfig | null, StyleProps] {
  let animationName: CSSAnimationKeyframes | null = null;
  let transitionProperty: CSSTransitionProperty | null = null;
  const animationConfig: Partial<CSSAnimationConfig> = {};
  const transitionConfig: Partial<CSSTransitionConfig> = {};
  const flattenedStyle: StyleProps = {};

  for (const style of styles) {
    for (const prop in style) {
      const value = style[prop];

      if (prop === 'animationName') {
        animationName = value as CSSAnimationKeyframes;
      } else if (prop === 'transitionProperty') {
        transitionProperty = value as CSSTransitionProperty;
      } else if (isAnimationSetting(prop)) {
        animationConfig[prop] = value;
      } else if (isTransitionSetting(prop)) {
        transitionConfig[prop] = value;
      } else if (isTransformString(prop, value)) {
        flattenedStyle[prop] = parseTransformString(value);
      } else if (isColorProp(prop, value)) {
        flattenedStyle[prop] = processCSSAnimationColor(value);
      } else {
        flattenedStyle[prop] = value;
      }
    }
  }

  // Return animationConfig only if the animationName is present
  const finalAnimationConfig = animationName
    ? ({ ...animationConfig, animationName } as CSSAnimationConfig)
    : null;

  // Return transitionConfig only if the transitionProperty is present
  const hasTransitionConfig = Array.isArray(transitionProperty)
    ? transitionProperty.length > 0
    : !!transitionProperty;
  const finalTransitionConfig = hasTransitionConfig
    ? ({ ...transitionConfig, transitionProperty } as CSSTransitionConfig)
    : null;

  return [finalAnimationConfig, finalTransitionConfig, flattenedStyle];
}
