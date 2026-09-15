'use strict';

import type {
  NonMutable,
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
