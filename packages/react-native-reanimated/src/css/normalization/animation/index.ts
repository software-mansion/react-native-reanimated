import { ReanimatedError } from '../../../errors';
import type {
  CSSAnimationConfig,
  NormalizedCSSAnimationConfig,
  CSSAnimationProperties,
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
}: CSSAnimationConfig): {
  normalizedConfig: NormalizedCSSAnimationConfig;
  animationProperties: CSSAnimationProperties;
} {
  if (!animationName || typeof animationName !== 'object') {
    throw new ReanimatedError(ERROR_MESSAGES.invalidAnimationName());
  }

  const { keyframeStyle, animationProperties } =
    processKeyframes(animationName);

  const normalizedConfig: NormalizedCSSAnimationConfig = {
    animationName: keyframeStyle,
    animationDuration: normalizeDuration(animationDuration),
    animationTimingFunction: normalizeTimingFunction(animationTimingFunction),
    animationDelay: normalizeDelay(animationDelay),
    animationIterationCount: normalizeIterationCount(animationIterationCount),
    animationDirection: normalizeDirection(animationDirection),
    animationFillMode: normalizeFillMode(animationFillMode),
    animationPlayState: normalizePlayState(animationPlayState),
  };

  return { normalizedConfig, animationProperties };
}

export function getNormalizedCSSAnimationSettingsUpdates(
  oldSettings: CSSAnimationSettings,
  newSettings: Partial<CSSAnimationSettings>
): Partial<NormalizedCSSAnimationSettings> {
  const updatedSettings: Partial<NormalizedCSSAnimationSettings> = {};

  if (newSettings.animationDuration !== oldSettings.animationDuration) {
    updatedSettings.animationDuration = normalizeDuration(
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
    updatedSettings.animationTimingFunction = normalizeTimingFunction(
      newSettings.animationTimingFunction
    );
  }
  if (newSettings.animationDelay !== oldSettings.animationDelay) {
    updatedSettings.animationDelay = normalizeDelay(newSettings.animationDelay);
  }
  if (
    newSettings.animationIterationCount !== oldSettings.animationIterationCount
  ) {
    updatedSettings.animationIterationCount = normalizeIterationCount(
      newSettings.animationIterationCount
    );
  }
  if (newSettings.animationDirection !== oldSettings.animationDirection) {
    updatedSettings.animationDirection = normalizeDirection(
      newSettings.animationDirection
    );
  }
  if (newSettings.animationFillMode !== oldSettings.animationFillMode) {
    updatedSettings.animationFillMode = normalizeFillMode(
      newSettings.animationFillMode
    );
  }
  if (newSettings.animationPlayState !== oldSettings.animationPlayState) {
    updatedSettings.animationPlayState = normalizePlayState(
      newSettings.animationPlayState
    );
  }

  return updatedSettings;
}
