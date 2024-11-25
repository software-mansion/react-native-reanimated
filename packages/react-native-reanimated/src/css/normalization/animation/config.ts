'use strict';
import { ReanimatedError } from '../../../errors';
import type {
  CSSAnimationConfig,
  NormalizedCSSAnimationConfig,
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

export function normalizeCSSAnimationConfig({
  animationName,
  animationDuration,
  animationDelay,
  animationTimingFunction,
  animationIterationCount,
  animationDirection,
  animationFillMode,
  animationPlayState,
}: CSSAnimationConfig): NormalizedCSSAnimationConfig {
  if (!animationName || typeof animationName !== 'object') {
    throw new ReanimatedError(ERROR_MESSAGES.invalidAnimationName());
  }

  return {
    ...normalizeAnimationName(animationName),
    duration: normalizeDuration(animationDuration),
    timingFunction: normalizeTimingFunction(animationTimingFunction),
    delay: normalizeDelay(animationDelay),
    iterationCount: normalizeIterationCount(animationIterationCount),
    direction: normalizeDirection(animationDirection),
    fillMode: normalizeFillMode(animationFillMode),
    playState: normalizePlayState(animationPlayState),
  };
}
