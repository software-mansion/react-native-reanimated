'use strict';
import type { SharedValue } from './commonTypes';

export function isSharedValue<T = unknown>(
  value: unknown
): value is SharedValue<T> {
  'worklet';
  // We cannot use `in` operator here because `value` could be a HostObject and therefore we cast.
  return (value as Record<string, unknown>)?._isReanimatedSharedValue === true;
}
