'use strict';
import { processCSSAnimationColor } from '../Colors';
import type { StyleProps } from '../commonTypes';
import type {
  AnimationSettingProp,
  CSSAnimationConfig,
  CSSAnimationKeyframes,
  CSSTransitionConfig,
  CSSTransitionProperty,
  TransformsArray,
  TransitionSettingProp,
} from './types';

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

const isPercentage = (value: string | number): value is `${number}%` => {
  return typeof value === 'string' && value.endsWith('%');
};

const isAngle = (
  value: string | number
): value is `${number}deg` | `${number}rad` => {
  return (
    typeof value === 'string' &&
    (value.endsWith('deg') || value.endsWith('rad'))
  );
};

export const parseTransformString = (
  transformString: string
): TransformsArray =>
  transformString.split(/\)\s*/).filter(Boolean).flatMap(parseTransform);

const parseTransform = (transform: string): TransformsArray[number][] => {
  const [key, valueString] = transform.split(/\(\s*/);
  const values = parseValues(valueString.replace(/\)$/g, ''));

  switch (key) {
    case 'translate':
      return parseTranslate(values);
    case 'translateX':
      return parseTranslateX(values);
    case 'translateY':
      return parseTranslateY(values);
    case 'scale':
      return parseScale(values);
    case 'rotate':
    case 'rotateX':
    case 'rotateY':
    case 'rotateZ':
      return parseRotate(key, values);
    case 'skew':
      return parseSkew(values);
    default:
      return [
        { [key]: values.length === 1 ? values[0] : values },
      ] as unknown as TransformsArray[number][];
  }
};

function parseValues(valueString: string): (string | number)[] {
  return valueString.split(',').map((value) => {
    const trimmedValue = value.trim();
    if (
      trimmedValue.endsWith('deg') ||
      trimmedValue.endsWith('rad') ||
      trimmedValue.endsWith('%')
    ) {
      return trimmedValue;
    }
    const numValue = parseFloat(trimmedValue);
    return isNaN(numValue) ? trimmedValue : numValue;
  });
}

function parseTranslate(
  values: (number | string)[]
): TransformsArray[number][] {
  const result: TransformsArray[number][] = [];

  if (isNumber(values[0]) || isPercentage(values[0])) {
    result.push({ translateX: values[0] });
  }
  if (isNumber(values[1]) || isPercentage(values[1])) {
    result.push({ translateY: values[1] });
  }

  return result;
}

function parseTranslateX(
  values: (number | string)[]
): TransformsArray[number][] {
  return isNumber(values[0]) || isPercentage(values[0])
    ? [{ translateX: values[0] }]
    : [];
}

function parseTranslateY(
  values: (number | string)[]
): TransformsArray[number][] {
  return isNumber(values[0]) || isPercentage(values[0])
    ? [{ translateY: values[0] }]
    : [];
}

function parseScale(values: (number | string)[]): TransformsArray[number][] {
  const result: TransformsArray[number][] = [];

  if (isNumber(values[0])) {
    result.push({ scaleX: values[0] });
  }
  if (isNumber(values[1])) {
    result.push({ scaleY: values[1] });
  } else if (isNumber(values[0])) {
    result.push({ scaleY: values[0] });
  }

  return result;
}

function parseRotate(
  key: string,
  values: (string | number)[]
): TransformsArray[number][] {
  if (isAngle(values[0])) {
    return [{ [key]: values[0] }] as unknown as TransformsArray[number][];
  }
  return [];
}

function parseSkew(values: (number | string)[]): TransformsArray[number][] {
  const result: TransformsArray[number][] = [];

  if (isAngle(values[0])) {
    result.push({ skewX: values[0] });
  }
  if (isAngle(values[1])) {
    result.push({ skewY: values[1] });
  }

  return result;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const haveDifferentValues = <T extends Array<any>>(
  arr1: T,
  arr2: T
): boolean => {
  const countDiffs: Record<string, number> = {};
  for (const value of arr1) {
    countDiffs[value] = (countDiffs[value] || 0) + 1;
  }
  for (const value of arr2) {
    countDiffs[value] = (countDiffs[value] || 0) - 1;
    if (countDiffs[value] < 0) {
      return true;
    }
  }
  return Object.values(countDiffs).some((count) => count !== 0);
};
