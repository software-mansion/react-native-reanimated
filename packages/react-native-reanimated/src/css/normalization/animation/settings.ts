'use strict';
import { ReanimatedError } from '../../../errors';
import type {
  CSSAnimationDirection,
  CSSAnimationFillMode,
  CSSAnimationIterationCount,
  CSSAnimationPlayState,
  CSSAnimationSettings,
  NormalizedCSSAnimationSettings,
} from '../../types';
import { deepEqual } from '../../utils';
import { isNumber } from '../../utils/typeGuards';
import {
  normalizeDelay,
  normalizeDuration,
  normalizeTimingFunction,
} from '../common';
import {
  VALID_ANIMATION_DIRECTIONS,
  VALID_FILL_MODES,
  VALID_PLAY_STATES,
} from './constants';

export const ERROR_MESSAGES = {
  invalidAnimationDirection: (direction: CSSAnimationDirection) =>
    `Invalid animation direction "${direction}".`,
  invalidIterationCount: (iterationCount: CSSAnimationIterationCount) =>
    `Invalid iteration count "${iterationCount}". Expected a number or "infinite".`,
  negativeIterationCount: (iterationCount: number) =>
    `Iteration count cannot be negative, received "${iterationCount}".`,
  invalidFillMode: (fillMode: CSSAnimationFillMode) =>
    `Invalid fill mode "${fillMode}".`,
  invalidPlayState: (playState: CSSAnimationPlayState) =>
    `Invalid play state "${playState}".`,
};

export function normalizeDirection(
  direction: CSSAnimationDirection = 'normal'
): CSSAnimationDirection {
  if (!VALID_ANIMATION_DIRECTIONS.has(direction)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidAnimationDirection(direction)
    );
  }
  return direction;
}

export function normalizeIterationCount(
  iterationCount: CSSAnimationIterationCount = 1
): number {
  if (iterationCount === 'infinite' || iterationCount === Infinity) {
    return -1;
  } else if (!isNumber(iterationCount)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidIterationCount(iterationCount)
    );
  } else if (iterationCount < 0) {
    throw new ReanimatedError(
      ERROR_MESSAGES.negativeIterationCount(iterationCount)
    );
  }
  return iterationCount;
}

export function normalizeFillMode(
  fillMode: CSSAnimationFillMode = 'none'
): CSSAnimationFillMode {
  if (!VALID_FILL_MODES.has(fillMode)) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidFillMode(fillMode));
  }
  return fillMode;
}

export function normalizePlayState(
  playState: CSSAnimationPlayState = 'running'
): CSSAnimationPlayState {
  if (!VALID_PLAY_STATES.has(playState)) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidPlayState(playState));
  }
  return playState;
}

export function getNormalizedCSSAnimationSettingsUpdates(
  oldSettings: CSSAnimationSettings,
  newSettings: Partial<CSSAnimationSettings>
): Partial<NormalizedCSSAnimationSettings> {
  const settingsUpdates: Partial<NormalizedCSSAnimationSettings> = {};

  if (newSettings.animationDuration !== oldSettings.animationDuration) {
    settingsUpdates.duration = normalizeDuration(newSettings.animationDuration);
  }
  // TODO- improve this check after implementing multiple animations support
  if (
    oldSettings.animationTimingFunction !==
      newSettings.animationTimingFunction &&
    (typeof oldSettings.animationTimingFunction !== 'object' ||
      typeof newSettings.animationTimingFunction !== 'object' ||
      !deepEqual(
        oldSettings.animationTimingFunction.normalize(),
        newSettings.animationTimingFunction.normalize()
      ))
  ) {
    settingsUpdates.timingFunction = normalizeTimingFunction(
      newSettings.animationTimingFunction
    );
  }
  if (newSettings.animationDelay !== oldSettings.animationDelay) {
    settingsUpdates.delay = normalizeDelay(newSettings.animationDelay);
  }
  if (
    newSettings.animationIterationCount !== oldSettings.animationIterationCount
  ) {
    settingsUpdates.iterationCount = normalizeIterationCount(
      newSettings.animationIterationCount
    );
  }
  if (newSettings.animationDirection !== oldSettings.animationDirection) {
    settingsUpdates.direction = normalizeDirection(
      newSettings.animationDirection
    );
  }
  if (newSettings.animationFillMode !== oldSettings.animationFillMode) {
    settingsUpdates.fillMode = normalizeFillMode(newSettings.animationFillMode);
  }
  if (newSettings.animationPlayState !== oldSettings.animationPlayState) {
    settingsUpdates.playState = normalizePlayState(
      newSettings.animationPlayState
    );
  }

  return settingsUpdates;
}
