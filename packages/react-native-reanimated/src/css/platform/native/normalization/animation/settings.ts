'use strict';
import { ReanimatedError } from '../../../../../common';
import type {
  CSSAnimationDirection,
  CSSAnimationFillMode,
  CSSAnimationIterationCount,
  CSSAnimationPlayState,
  SingleCSSAnimationSettings,
} from '../../../../types';
import { deepEqual, isNumber } from '../../../../utils';
import type { NormalizedSingleCSSAnimationSettings } from '../../types';
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

export function normalizeSingleCSSAnimationSettings({
  animationDuration,
  animationTimingFunction,
  animationDelay,
  animationIterationCount,
  animationDirection,
  animationFillMode,
  animationPlayState,
}: SingleCSSAnimationSettings): NormalizedSingleCSSAnimationSettings {
  return {
    duration: normalizeDuration(animationDuration),
    timingFunction: normalizeTimingFunction(animationTimingFunction),
    delay: normalizeDelay(animationDelay),
    iterationCount: normalizeIterationCount(animationIterationCount),
    direction: normalizeDirection(animationDirection),
    fillMode: normalizeFillMode(animationFillMode),
    playState: normalizePlayState(animationPlayState),
  };
}

export function getAnimationSettingsUpdates(
  oldConfig: NormalizedSingleCSSAnimationSettings,
  newConfig: NormalizedSingleCSSAnimationSettings
): Partial<NormalizedSingleCSSAnimationSettings> {
  const updatedSettings: Partial<NormalizedSingleCSSAnimationSettings> = {};

  if (oldConfig.duration !== newConfig.duration) {
    updatedSettings.duration = newConfig.duration;
  }
  if (
    oldConfig.timingFunction !== newConfig.timingFunction &&
    (typeof oldConfig.timingFunction !== 'object' ||
      // TODO - maybe replace by some better solution than deepEqual
      !deepEqual(oldConfig.timingFunction, newConfig.timingFunction))
  ) {
    updatedSettings.timingFunction = newConfig.timingFunction;
  }
  if (oldConfig.delay !== newConfig.delay) {
    updatedSettings.delay = newConfig.delay;
  }
  if (oldConfig.iterationCount !== newConfig.iterationCount) {
    updatedSettings.iterationCount = newConfig.iterationCount;
  }
  if (oldConfig.direction !== newConfig.direction) {
    updatedSettings.direction = newConfig.direction;
  }
  if (oldConfig.fillMode !== newConfig.fillMode) {
    updatedSettings.fillMode = newConfig.fillMode;
  }
  if (oldConfig.playState !== newConfig.playState) {
    updatedSettings.playState = newConfig.playState;
  }

  return updatedSettings;
}
