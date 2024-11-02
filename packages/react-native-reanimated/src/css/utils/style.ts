'use strict';
import type { StyleProps } from '../../commonTypes';
import { normalizeStyle } from '../normalization';
import type {
  CSSAnimationConfig,
  CSSAnimationKeyframes,
  CSSTransitionConfig,
  CSSTransitionProperty,
} from '../types';
import { isAnimationSetting, isTransitionSetting } from './typeGuards';

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

  return [
    finalAnimationConfig,
    finalTransitionConfig,
    normalizeStyle(flattenedStyle),
  ];
}
