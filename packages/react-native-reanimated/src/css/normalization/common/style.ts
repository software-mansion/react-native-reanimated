'use strict';
import { ReanimatedError } from '../../../errors';
import type { StyleProps } from '../../../commonTypes';
import {
  isAnimationSetting,
  isColorProp,
  isTransformString,
  isTransitionSetting,
} from '../../utils';
import { normalizeTransformString } from './transformString';
import { normalizeCSSAnimationColor } from '../../../Colors';
import { normalizeTransformOrigin } from './transformOrigin';
import type {
  CSSAnimationConfig,
  CSSTransitionConfig,
  CSSAnimationKeyframes,
  CSSTransitionProperty,
} from '../../types';

export const ERROR_MESSAGES = {
  invalidColor: (color: string) => `Invalid color value: ${color}`,
};

type PropertyName = keyof StyleProps;

export function normalizeStyle(style: StyleProps): StyleProps {
  const entries: [PropertyName, StyleProps[PropertyName]][] = [];

  for (const [key, value] of Object.entries(style)) {
    let propValue = value;

    if (value === 'auto') {
      propValue = undefined;
    }

    if (isColorProp(key, propValue)) {
      const normalizedColor = normalizeCSSAnimationColor(propValue);
      if (!normalizedColor && normalizedColor !== 0) {
        throw new ReanimatedError(ERROR_MESSAGES.invalidColor(propValue));
      }
      entries.push([key, normalizedColor]);
      continue;
    }

    if (isTransformString(key, propValue)) {
      entries.push([key, normalizeTransformString(propValue)]);
      continue;
    }

    switch (key) {
      case 'transformOrigin':
        entries.push([key, normalizeTransformOrigin(propValue)]);
        break;
      case 'gap':
        entries.push(['rowGap', propValue], ['columnGap', propValue]);
        break;
      default:
        entries.push([key, propValue]);
    }
  }

  return Object.fromEntries(entries);
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
      } else {
        flattenedStyle[prop] = value;
      }
    }
  }

  // Return animationConfig only if the animationName is present
  const hasAnimationName =
    animationName &&
    typeof animationName === 'object' &&
    Object.keys(animationName).length > 0;
  const finalAnimationConfig = hasAnimationName
    ? ({ ...animationConfig, animationName } as CSSAnimationConfig)
    : null;

  // Return transitionConfig only if the transitionProperty is present
  const hasTransitionConfig = Array.isArray(transitionProperty)
    ? transitionProperty.length > 0
    : !!transitionProperty;
  const finalTransitionConfig = hasTransitionConfig
    ? ({ ...transitionConfig, transitionProperty } as CSSTransitionConfig)
    : null;

  return [
    finalAnimationConfig,
    finalTransitionConfig,
    normalizeStyle(flattenedStyle),
  ];
}
