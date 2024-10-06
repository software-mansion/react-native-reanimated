'use strict';
import { ReanimatedError } from '../../../errors';
import type {
  CSSAnimationConfig,
  NormalizedCSSAnimationConfig,
  CSSAnimationSettings,
  NormalizedCSSAnimationSettings,
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
} from './base';
import { processKeyframes } from './keyframes';

const ERROR_MESSAGES = {
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

  const keyframeStyle = processKeyframes(animationName);

  return {
    animationName: keyframeStyle,
    animationDuration: normalizeDuration(animationDuration),
    animationTimingFunction: normalizeTimingFunction(animationTimingFunction),
    animationDelay: normalizeDelay(animationDelay),
    animationIterationCount: normalizeIterationCount(animationIterationCount),
    animationDirection: normalizeDirection(animationDirection),
    animationFillMode: normalizeFillMode(animationFillMode),
    animationPlayState: normalizePlayState(animationPlayState),
  };
}

export function getNormalizedCSSAnimationSettingsUpdates(
  oldSettings: CSSAnimationSettings,
  newSettings: Partial<CSSAnimationSettings>
): Partial<NormalizedCSSAnimationSettings> {
  const settingsUpdates: Partial<NormalizedCSSAnimationSettings> = {};

  if (newSettings.animationDuration !== oldSettings.animationDuration) {
    settingsUpdates.animationDuration = normalizeDuration(
      newSettings.animationDuration
    );
  }
  if (
    typeof oldSettings.animationTimingFunction === 'string'
      ? oldSettings.animationTimingFunction !==
        newSettings.animationTimingFunction
      : !oldSettings.animationTimingFunction?.equals(
          newSettings.animationTimingFunction
        )
  ) {
    settingsUpdates.animationTimingFunction = normalizeTimingFunction(
      newSettings.animationTimingFunction
    );
  }
  if (newSettings.animationDelay !== oldSettings.animationDelay) {
    settingsUpdates.animationDelay = normalizeDelay(newSettings.animationDelay);
  }
  if (
    newSettings.animationIterationCount !== oldSettings.animationIterationCount
  ) {
    settingsUpdates.animationIterationCount = normalizeIterationCount(
      newSettings.animationIterationCount
    );
  }
  if (newSettings.animationDirection !== oldSettings.animationDirection) {
    settingsUpdates.animationDirection = normalizeDirection(
      newSettings.animationDirection
    );
  }
  if (newSettings.animationFillMode !== oldSettings.animationFillMode) {
    settingsUpdates.animationFillMode = normalizeFillMode(
      newSettings.animationFillMode
    );
  }
  if (newSettings.animationPlayState !== oldSettings.animationPlayState) {
    settingsUpdates.animationPlayState = normalizePlayState(
      newSettings.animationPlayState
    );
  }

  return settingsUpdates;
}
