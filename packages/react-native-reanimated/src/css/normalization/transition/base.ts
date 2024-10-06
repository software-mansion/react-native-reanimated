'use strict';
import type { ViewStyle } from 'react-native';
import type { CSSTransitionProperty } from '../../types';

export function normalizeTransitionProperty(
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
