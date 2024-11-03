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
import { createKeyframeStyle } from './keyframes';

export const ERROR_MESSAGES = {
  invalidAnimationName: () =>
    `[Reanimated] Invalid animation name. Expected a keyframes object.`,
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
    animationName: createKeyframeStyle(animationName),
    animationDuration: normalizeDuration(animationDuration),
    animationTimingFunction: normalizeTimingFunction(animationTimingFunction),
    animationDelay: normalizeDelay(animationDelay),
    animationIterationCount: normalizeIterationCount(animationIterationCount),
    animationDirection: normalizeDirection(animationDirection),
    animationFillMode: normalizeFillMode(animationFillMode),
    animationPlayState: normalizePlayState(animationPlayState),
  };
}
