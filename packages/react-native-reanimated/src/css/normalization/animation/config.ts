'use strict';
import type {
  ConvertValuesToArrays,
  CSSAnimationProperties,
  NormalizedSingleCSSAnimationConfig,
  SingleCSSAnimationProperties,
} from '../../types';
import {
  normalizeDuration,
  normalizeTimingFunction,
  normalizeDelay,
} from '../common';
import {
  normalizeIterationCount,
  normalizeDirection,
  normalizeFillMode,
  normalizePlayState,
} from './settings';
import { normalizeAnimationName } from './animationName';
import { ReanimatedError } from '../../errors';

export const ERROR_MESSAGES = {
  invalidAnimationName: () =>
    `Invalid animation name. Expected a keyframes object.`,
};

function convertConfigPropertiesToArrays(config: CSSAnimationProperties) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => {
      return [key, Array.isArray(value) ? value : [value]];
    })
  ) as ConvertValuesToArrays<SingleCSSAnimationProperties>;
}

export function normalizeCSSAnimationProperties(
  config: CSSAnimationProperties
): NormalizedSingleCSSAnimationConfig[] {
  const {
    animationName,
    animationDuration,
    animationTimingFunction,
    animationDelay,
    animationIterationCount,
    animationDirection,
    animationFillMode,
    animationPlayState,
  } = convertConfigPropertiesToArrays(config);

  return animationName.map((keyframes, index) => {
    if (!keyframes || typeof keyframes !== 'object') {
      throw new ReanimatedError(ERROR_MESSAGES.invalidAnimationName());
    }

    return {
      ...normalizeAnimationName(keyframes),
      duration: normalizeDuration(
        animationDuration?.[index % animationDuration.length]
      ),
      timingFunction: normalizeTimingFunction(
        animationTimingFunction?.[index % animationTimingFunction.length]
      ),
      delay: normalizeDelay(animationDelay?.[index % animationDelay.length]),
      iterationCount: normalizeIterationCount(
        animationIterationCount?.[index % animationIterationCount.length]
      ),
      direction: normalizeDirection(
        animationDirection?.[index % animationDirection.length]
      ),
      fillMode: normalizeFillMode(
        animationFillMode?.[index % animationFillMode.length]
      ),
      playState: normalizePlayState(
        animationPlayState?.[index % animationPlayState.length]
      ),
    };
  });
}
