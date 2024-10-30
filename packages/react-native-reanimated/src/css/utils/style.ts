'use strict';
import { processCSSAnimationColor } from '../../Colors';
import type { StyleProps } from '../../commonTypes';
import {
  normalizeTransformOrigin,
  normalizeTransformString,
} from '../normalization';
import type {
  CSSAnimationConfig,
  CSSAnimationKeyframes,
  CSSTransitionConfig,
  CSSTransitionProperty,
} from '../types';
import {
  isAnimationSetting,
  isColorProp,
  isTransformOrigin,
  isTransformString,
  isTransitionSetting,
} from './typeGuards';

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
      let value = style[prop];
      if (value === 'auto') {
        value = undefined;
      }

      if (prop === 'animationName') {
        animationName = value as CSSAnimationKeyframes;
      } else if (prop === 'transitionProperty') {
        transitionProperty = value as CSSTransitionProperty;
      } else if (isAnimationSetting(prop)) {
        animationConfig[prop] = value;
      } else if (isTransitionSetting(prop)) {
        transitionConfig[prop] = value;
      } else if (isTransformString(prop, value)) {
        flattenedStyle[prop] = normalizeTransformString(value);
      } else if (isColorProp(prop, value)) {
        flattenedStyle[prop] = processCSSAnimationColor(value);
      } else if (isTransformOrigin(prop, value)) {
        flattenedStyle[prop] = normalizeTransformOrigin(value);
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
