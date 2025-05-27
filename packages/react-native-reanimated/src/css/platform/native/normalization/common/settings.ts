'use strict';
import { ReanimatedError } from '../../../../../common';
import {
  MILLISECONDS_REGEX,
  SECONDS_REGEX,
  VALID_PREDEFINED_TIMING_FUNCTIONS,
} from '../../../../constants';
import type {
  CSSTimingFunction,
  NormalizedCSSTimingFunction,
  PredefinedTimingFunction,
} from '../../../../easings';
import type { TimeUnit } from '../../../../types';
import { isPredefinedTimingFunction } from '../../../../utils';

export const ERROR_MESSAGES = {
  invalidDelay: (timeUnit: TimeUnit) =>
    `Invalid delay "${timeUnit}". Expected a number, "ms", or "s".`,
  invalidDuration: (duration: TimeUnit) =>
    `Invalid duration "${duration}". Expected a number, "ms", or "s".`,
  negativeDuration: (duration: TimeUnit) =>
    `Duration cannot be negative, received "${duration}".`,
  invalidPredefinedTimingFunction: (timingFunction: PredefinedTimingFunction) =>
    `Invalid predefined timing function "${timingFunction}". Supported values are: ${VALID_PREDEFINED_TIMING_FUNCTIONS.join(', ')}.`,
  invalidParametrizedTimingFunction: (timingFunction: CSSTimingFunction) =>
    `Invalid parametrized timing function "${timingFunction?.toString()}".`,
};

function normalizeTimeUnit(timeUnit: TimeUnit): number | null {
  if (typeof timeUnit === 'number') {
    return timeUnit;
  } else if (MILLISECONDS_REGEX.test(timeUnit)) {
    return parseInt(timeUnit, 10);
  } else if (SECONDS_REGEX.test(timeUnit)) {
    return parseFloat(timeUnit) * 1000;
  }
  return null;
}

export function normalizeDelay(delay: TimeUnit = 0): number {
  const delayMs = normalizeTimeUnit(delay);
  if (delayMs === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidDelay(delay));
  }
  return delayMs;
}

export function normalizeDuration(duration: TimeUnit = 0): number {
  const durationMs = normalizeTimeUnit(duration);
  if (durationMs === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidDuration(duration));
  } else if (durationMs < 0) {
    throw new ReanimatedError(ERROR_MESSAGES.negativeDuration(duration));
  }
  return durationMs;
}

export function normalizeTimingFunction(
  timingFunction: CSSTimingFunction = 'ease'
): NormalizedCSSTimingFunction {
  if (typeof timingFunction === 'string') {
    if (!isPredefinedTimingFunction(timingFunction)) {
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidPredefinedTimingFunction(timingFunction)
      );
    }
    return timingFunction;
  }
  if (
    !timingFunction.normalize ||
    typeof timingFunction.normalize !== 'function'
  ) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidParametrizedTimingFunction(timingFunction)
    );
  }
  return timingFunction.normalize();
}
