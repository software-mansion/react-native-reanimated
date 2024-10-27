'use strict';
import { ReanimatedError } from '../../../errors';
import type {
  CSSTimingFunction,
  NormalizedCSSTimingFunction,
  PredefinedTimingFunction,
} from '../../easing';
import type { CSSTimeUnit } from '../../types';

const VALID_PREDEFINED_TIMING_FUNCTIONS = new Set<PredefinedTimingFunction>([
  'linear',
  'ease',
  'easeIn',
  'easeOut',
  'easeInOut',
  'stepStart',
  'stepEnd',
]);

const ERROR_MESSAGES = {
  invalidDelay: (timeUnit: CSSTimeUnit) =>
    `[Reanimated] Invalid delay "${timeUnit}". Expected a number, "ms", or "s".`,
  invalidDuration: (duration: CSSTimeUnit) =>
    `[Reanimated] Invalid duration "${duration}". Expected a number, "ms", or "s".`,
  negativeDuration: (duration: CSSTimeUnit) =>
    `[Reanimated] Duration cannot be negative, received "${duration}".`,
  invalidPredefinedTimingFunction: (timingFunction: PredefinedTimingFunction) =>
    `[Reanimated] Invalid predefined timing function "${timingFunction}". Supported values are: ${Array.from(
      VALID_PREDEFINED_TIMING_FUNCTIONS
    ).join(', ')}.`,
  invalidParametrizedTimingFunction: (timingFunction: CSSTimingFunction) =>
    `[Reanimated] Invalid parametrized timing function "${timingFunction?.toString()}".`,
};

function normalizeTimeUnit(timeUnit: CSSTimeUnit): number | null {
  if (typeof timeUnit === 'number') {
    return timeUnit;
  } else if (timeUnit?.endsWith('ms')) {
    return parseInt(timeUnit, 10);
  } else if (timeUnit?.endsWith('s')) {
    return parseFloat(timeUnit) * 1000;
  }
  return null;
}

export function normalizeDelay(delay: CSSTimeUnit = 0): number {
  const delayMs = normalizeTimeUnit(delay);
  if (delayMs === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidDelay(delay));
  }
  return delayMs;
}

export function normalizeDuration(duration: CSSTimeUnit = 0): number {
  const durationMs = normalizeTimeUnit(duration);
  if (durationMs === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidDuration(duration));
  } else if (durationMs < 0) {
    throw new ReanimatedError(ERROR_MESSAGES.negativeDuration(durationMs));
  }
  return durationMs;
}

export function normalizeTimingFunction(
  timingFunction: CSSTimingFunction = 'ease'
): NormalizedCSSTimingFunction {
  if (typeof timingFunction === 'string') {
    if (!VALID_PREDEFINED_TIMING_FUNCTIONS.has(timingFunction)) {
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
