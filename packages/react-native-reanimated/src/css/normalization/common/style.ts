'use strict';
import {
  isAnimationSetting,
  isColorProp,
  isCSSKeyframesObject,
  isCSSKeyframesRule,
  isTransformString,
  isTransitionProp,
} from '../../utils';
import { normalizeTransformString } from './transformString';
import { processColor } from '../../../Colors';
import { normalizeTransformOrigin } from './transformOrigin';
import type {
  AnyRecord,
  PlainStyle,
  CSSAnimationProperties,
  CSSTransitionProperties,
  Maybe,
} from '../../types';
import { ReanimatedError } from '../../errors';

type PropertyName = keyof PlainStyle;

export const ERROR_MESSAGES = {
  invalidColor: (color: Maybe<number | string>) =>
    `Invalid color value: ${color}`,
  unsupportedAspectRatio: (ratio: string | number) =>
    `Unsupported aspect ratio: ${ratio}. Expected a number or a string in "a/b" format.`,
  invalidFontWeight: (weight: string | number) =>
    `Invalid font weight value: ${weight}`,
};

function normalizeColor(value: string | number) {
  let normalizedColor: Maybe<number | string> = null;

  if (typeof value === 'string') {
    if (value === 'transparent') {
      normalizedColor = 'transparent';
    } else {
      normalizedColor = processColor(value, false);
    }
  } else {
    // case of number format 0xRRGGBBAA format needs to be re-formatted
    normalizedColor = processColor(
      `#${value.toString(16).padStart(8, '0')}`,
      false
    );
  }

  if (!normalizedColor && normalizedColor !== 0) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
  }

  return normalizedColor;
}

function normalizeAspectRatio(value: string | number): number {
  if (typeof value === 'number' || !isNaN(+value)) {
    return +value;
  } else if (typeof value === 'string') {
    const parts = value.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
    }
  }

  throw new ReanimatedError(ERROR_MESSAGES.unsupportedAspectRatio(value));
}

const FONT_WEIGHT_MAPPINGS = {
  thin: '100',
  ultralight: '200',
  light: '300',
  normal: '400',
  regular: '400',
  medium: '500',
  condensed: '500',
  semibold: '600',
  bold: '700',
  condensedBold: '700',
  heavy: '800',
  black: '900',
} as const;

function normalizeFontWeight(value: string | number): string {
  if (typeof value === 'number' || !isNaN(+value)) {
    return value.toString();
  }

  if (value in FONT_WEIGHT_MAPPINGS) {
    return FONT_WEIGHT_MAPPINGS[value as keyof typeof FONT_WEIGHT_MAPPINGS];
  }

  throw new ReanimatedError(ERROR_MESSAGES.invalidFontWeight(value));
}

export function normalizeStyle(style: PlainStyle): PlainStyle {
  const entries: [string, PlainStyle[PropertyName]][] = [];

  for (const [key, value] of Object.entries(style)) {
    let propValue = value;

    if (value === 'auto' || value === undefined) {
      propValue = undefined;
    } else if (isColorProp(key, propValue)) {
      entries.push([key, normalizeColor(propValue)]);
    } else if (isTransformString(key, propValue)) {
      entries.push([key, normalizeTransformString(propValue)]);
    } else {
      switch (key) {
        case 'transformOrigin':
          entries.push([key, normalizeTransformOrigin(propValue)]);
          break;
        case 'gap':
          entries.push(['rowGap', propValue], ['columnGap', propValue]);
          break;
        case 'aspectRatio':
          entries.push([key, normalizeAspectRatio(propValue)]);
          break;
        case 'fontWeight':
          entries.push([key, normalizeFontWeight(propValue)]);
          break;
        default:
          entries.push([key, propValue]);
      }
    }
  }

  return Object.fromEntries(entries);
}

export function filterCSSPropertiesAndNormalizeStyle(
  style: PlainStyle
): [CSSAnimationProperties | null, CSSTransitionProperties | null, PlainStyle] {
  let animationName: CSSAnimationProperties['animationName'] | null = null;
  const animationProperties: Partial<CSSAnimationProperties> = {};
  const transitionProperties: Partial<CSSTransitionProperties> = {};
  const filteredStyle: AnyRecord = {};

  for (const [prop, value] of Object.entries(style)) {
    if (prop === 'animationName') {
      animationName = value as CSSAnimationProperties['animationName'];
    } else if (isAnimationSetting(prop)) {
      animationProperties[prop] = value;
    } else if (isTransitionProp(prop)) {
      transitionProperties[prop] = value;
    } else {
      filteredStyle[prop] = value;
    }
  }

  // Return animationProperties only if at least one animationName contains
  // valid keyframes
  const hasAnimationName =
    animationName &&
    (Array.isArray(animationName) ? animationName : [animationName]).every(
      (keyframes) =>
        (isCSSKeyframesRule(keyframes) && keyframes.length > 0) ||
        isCSSKeyframesObject(keyframes)
    );
  const finalAnimationConfig = hasAnimationName
    ? ({ ...animationProperties, animationName } as CSSAnimationProperties)
    : null;

  // Return transitionProperties only if the transitionProperty is present
  const hasTransitionConfig = Object.keys(transitionProperties).length > 0;
  const finalTransitionConfig = hasTransitionConfig
    ? transitionProperties
    : null;

  return [
    finalAnimationConfig,
    finalTransitionConfig,
    normalizeStyle(filteredStyle),
  ];
}
