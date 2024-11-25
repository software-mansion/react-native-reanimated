'use strict';
import { ReanimatedError } from '../../../errors';
import type {
  ConvertValuesToArrays,
  CSSAnimationConfig,
  NormalizedSingleCSSAnimationConfig,
  SingleCSSAnimationConfig,
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

export const ERROR_MESSAGES = {
  invalidAnimationName: () =>
    `Invalid animation name. Expected a keyframes object.`,
};

function convertConfigPropertiesToArrays(config: CSSAnimationConfig) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => {
      return [key, Array.isArray(value) ? value : [value]];
    })
  ) as ConvertValuesToArrays<SingleCSSAnimationConfig>;
}

export function normalizeCSSAnimationConfig(
  config: CSSAnimationConfig
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
