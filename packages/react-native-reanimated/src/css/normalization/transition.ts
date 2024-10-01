import type { ViewStyle } from 'react-native';
import type {
  CSSTransitionConfig,
  CSSTransitionProperty,
  NormalizedCSSTransitionConfig,
} from '../types';
import {
  normalizeDelay,
  normalizeDuration,
  normalizeTimingFunction,
} from './common';

function normalizeTransitionProperty(
  transitionProperty: CSSTransitionProperty,
  viewStyle: ViewStyle
): string[] {
  if (Array.isArray(transitionProperty)) {
    return transitionProperty;
  }
  if (transitionProperty === 'all') {
    return Object.keys(viewStyle);
  }
  if (transitionProperty === 'none') {
    return [];
  }
  return [transitionProperty];
}

export function normalizeCSSTransitionConfig(
  {
    transitionProperty,
    transitionDuration,
    transitionTimingFunction,
    transitionDelay,
  }: CSSTransitionConfig,
  viewStyle: ViewStyle
): NormalizedCSSTransitionConfig {
  return {
    transitionProperty: normalizeTransitionProperty(
      transitionProperty,
      viewStyle
    ),
    transitionDuration: normalizeDuration(transitionDuration),
    transitionTimingFunction: normalizeTimingFunction(transitionTimingFunction),
    transitionDelay: normalizeDelay(transitionDelay),
  };
}
