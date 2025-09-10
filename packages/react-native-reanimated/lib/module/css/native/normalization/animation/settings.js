'use strict';

import { ReanimatedError } from "../../../../common/index.js";
import { deepEqual, isNumber } from "../../../utils/index.js";
import { normalizeDelay, normalizeDuration, normalizeTimingFunction } from "../common/index.js";
import { VALID_ANIMATION_DIRECTIONS, VALID_FILL_MODES, VALID_PLAY_STATES } from "./constants.js";
export const ERROR_MESSAGES = {
  invalidAnimationDirection: direction => `Invalid animation direction "${direction}".`,
  invalidIterationCount: iterationCount => `Invalid iteration count "${iterationCount}". Expected a number or "infinite".`,
  negativeIterationCount: iterationCount => `Iteration count cannot be negative, received "${iterationCount}".`,
  invalidFillMode: fillMode => `Invalid fill mode "${fillMode}".`,
  invalidPlayState: playState => `Invalid play state "${playState}".`
};
export function normalizeDirection(direction = 'normal') {
  if (!VALID_ANIMATION_DIRECTIONS.has(direction)) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidAnimationDirection(direction));
  }
  return direction;
}
export function normalizeIterationCount(iterationCount = 1) {
  if (iterationCount === 'infinite' || iterationCount === Infinity) {
    return -1;
  } else if (!isNumber(iterationCount)) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidIterationCount(iterationCount));
  } else if (iterationCount < 0) {
    throw new ReanimatedError(ERROR_MESSAGES.negativeIterationCount(iterationCount));
  }
  return iterationCount;
}
export function normalizeFillMode(fillMode = 'none') {
  if (!VALID_FILL_MODES.has(fillMode)) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidFillMode(fillMode));
  }
  return fillMode;
}
export function normalizePlayState(playState = 'running') {
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
  animationPlayState
}) {
  return {
    duration: normalizeDuration(animationDuration),
    timingFunction: normalizeTimingFunction(animationTimingFunction),
    delay: normalizeDelay(animationDelay),
    iterationCount: normalizeIterationCount(animationIterationCount),
    direction: normalizeDirection(animationDirection),
    fillMode: normalizeFillMode(animationFillMode),
    playState: normalizePlayState(animationPlayState)
  };
}
export function getAnimationSettingsUpdates(oldConfig, newConfig) {
  const updatedSettings = {};
  if (oldConfig.duration !== newConfig.duration) {
    updatedSettings.duration = newConfig.duration;
  }
  if (oldConfig.timingFunction !== newConfig.timingFunction && (typeof oldConfig.timingFunction !== 'object' ||
  // TODO - maybe replace by some better solution than deepEqual
  !deepEqual(oldConfig.timingFunction, newConfig.timingFunction))) {
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
//# sourceMappingURL=settings.js.map