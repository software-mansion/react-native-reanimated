'use strict';
import type {
  CSSTransitionConfig,
  NormalizedCSSTransitionConfig,
  NormalizedTransitionProperty,
} from '../../types';
import { haveDifferentValues } from '../../utils/comparison';
import {
  normalizeDuration,
  normalizeTimingFunction,
  normalizeDelay,
} from '../common';
import { normalizeTransitionProperty } from './base';

export function normalizeCSSTransitionConfig({
  transitionProperty,
  transitionDuration,
  transitionTimingFunction,
  transitionDelay,
}: CSSTransitionConfig): NormalizedCSSTransitionConfig {
  return {
    properties: normalizeTransitionProperty(transitionProperty),
    duration: normalizeDuration(transitionDuration),
    timingFunction: normalizeTimingFunction(transitionTimingFunction),
    delay: normalizeDelay(transitionDelay),
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
    configUpdates.properties = newNormalizedTransitionProperties;
  }

  if (newConfig.transitionDuration !== oldConfig.transitionDuration) {
    configUpdates.duration = normalizeDuration(newConfig.transitionDuration);
  }

  if (
    typeof oldConfig.transitionTimingFunction === 'object'
      ? !oldConfig.transitionTimingFunction.equals(
          newConfig.transitionTimingFunction
        )
      : oldConfig.transitionTimingFunction !==
        newConfig.transitionTimingFunction
  ) {
    configUpdates.timingFunction = normalizeTimingFunction(
      newConfig.transitionTimingFunction
    );
  }

  if (newConfig.transitionDelay !== oldConfig.transitionDelay) {
    configUpdates.delay = normalizeDelay(newConfig.transitionDelay);
  }

  return configUpdates;
}
