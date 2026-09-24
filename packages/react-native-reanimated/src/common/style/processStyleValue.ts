'use strict';

import { logger } from '../logger';
import type {
  NonMutable,
  UnknownRecord,
  ValueProcessor,
  ValueProcessorContext,
} from '../types';

export function processStyleValue<V, R>(
  processor: ValueProcessor<V, R>,
  value: NonMutable<V>,
  context?: ValueProcessorContext
) {
  'worklet';
  // CSS strips whitespace around a declaration value, so processors can
  // assume they are given a trimmed string.
  const normalizedValue = (
    typeof value === 'string' ? value.trim() : value
  ) as NonMutable<V>;
  return processor(normalizedValue, context);
}

// Thrown errors carry the prefix that the logger adds on its own.
const ERROR_PREFIX = '[Reanimated] ';

export const WARN_MESSAGES = {
  ignoredValue(reason: string) {
    'worklet';
    return `${reason}\nThe value is ignored.`;
  },
};

/**
 * Reports a style value that a processor rejected. The value is ignored like an
 * invalid CSS declaration instead of throwing, which on the UI runtime would
 * crash the app.
 */
export function warnIgnoredStyleValue(error: unknown) {
  'worklet';
  if (__DEV__) {
    const message = error instanceof Error ? error.message : String(error);
    const reason = message.replace(ERROR_PREFIX, '');
    logger.warn(WARN_MESSAGES.ignoredValue(reason), { strict: true });
  }
}

/**
 * Processes `props[key]` in place. A rejected value is removed, so the prop
 * keeps its current value.
 */
export function processStylePropInPlace<V, R>(
  props: UnknownRecord,
  key: string,
  processor: ValueProcessor<V, R>
) {
  'worklet';
  // null resets the prop, the same as in React Native.
  if (props[key] === null) {
    return;
  }
  try {
    props[key] = processStyleValue(processor, props[key] as NonMutable<V>);
  } catch (error) {
    warnIgnoredStyleValue(error);
    delete props[key];
  }
}
