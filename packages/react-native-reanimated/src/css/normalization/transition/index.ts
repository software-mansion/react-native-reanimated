'use strict';
import type { ViewStyle } from 'react-native';
import type {
  CSSTransitionConfig,
  NormalizedCSSTransitionConfig,
} from '../../types';
import {
  normalizeDuration,
  normalizeTimingFunction,
  normalizeDelay,
} from '../common';
import { normalizeTransitionProperty } from './base';
import { haveDifferentValues } from '../../utils';

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

export function getNormalizedCSSTransitionConfigUpdates(
  oldNormalizedTransitionProperties: string[],
  oldConfig: CSSTransitionConfig,
  newConfig: Partial<CSSTransitionConfig>,
  newViewStyle: ViewStyle
): Partial<NormalizedCSSTransitionConfig> {
  const configUpdates: Partial<NormalizedCSSTransitionConfig> = {};

  const newNormalizedTransitionProperties = normalizeTransitionProperty(
    newConfig.transitionProperty ?? 'none',
    newViewStyle
  );

  if (
    oldNormalizedTransitionProperties.length !==
      newNormalizedTransitionProperties.length ||
    haveDifferentValues(
      oldNormalizedTransitionProperties,
      newNormalizedTransitionProperties
    )
  ) {
    configUpdates.transitionProperty = newNormalizedTransitionProperties;
  }
  if (newConfig.transitionDuration !== oldConfig.transitionDuration) {
    configUpdates.transitionDuration = normalizeDuration(
      newConfig.transitionDuration
    );
  }
  if (
    newConfig.transitionTimingFunction !== oldConfig.transitionTimingFunction
  ) {
    configUpdates.transitionTimingFunction = normalizeTimingFunction(
      newConfig.transitionTimingFunction
    );
  }
  if (newConfig.transitionDelay !== oldConfig.transitionDelay) {
    configUpdates.transitionDelay = normalizeDelay(newConfig.transitionDelay);
  }

  return configUpdates;
}
