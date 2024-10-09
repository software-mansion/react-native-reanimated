'use strict';
import type {
  CSSTransitionConfig,
  NormalizedCSSTransitionConfig,
  NormalizedTransitionProperty,
} from '../../types';
import {
  normalizeDuration,
  normalizeTimingFunction,
  normalizeDelay,
} from '../common';
import { normalizeTransitionProperty } from './base';
import { haveDifferentValues } from '../../utils';

export function normalizeCSSTransitionConfig({
  transitionProperty,
  transitionDuration,
  transitionTimingFunction,
  transitionDelay,
}: CSSTransitionConfig): NormalizedCSSTransitionConfig {
  return {
    transitionProperty: normalizeTransitionProperty(transitionProperty),
    transitionDuration: normalizeDuration(transitionDuration),
    transitionTimingFunction: normalizeTimingFunction(transitionTimingFunction),
    transitionDelay: normalizeDelay(transitionDelay),
  };
}

export function getNormalizedCSSTransitionConfigUpdates(
  oldNormalizedTransitionProperties: NormalizedTransitionProperty,
  oldConfig: CSSTransitionConfig,
  newConfig: Partial<CSSTransitionConfig>
): Partial<NormalizedCSSTransitionConfig> {
  const configUpdates: Partial<NormalizedCSSTransitionConfig> = {};

  const newNormalizedTransitionProperties = normalizeTransitionProperty(
    newConfig.transitionProperty ?? 'none'
  );

  if (
    typeof oldNormalizedTransitionProperties !==
      typeof newNormalizedTransitionProperties ||
    (Array.isArray(oldNormalizedTransitionProperties) &&
      Array.isArray(newNormalizedTransitionProperties) &&
      (oldNormalizedTransitionProperties.length !==
        newNormalizedTransitionProperties.length ||
        haveDifferentValues(
          oldNormalizedTransitionProperties,
          newNormalizedTransitionProperties
        )))
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
