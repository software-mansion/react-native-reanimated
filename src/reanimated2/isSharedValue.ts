'use strict';
import type { SharedValue } from './commonTypes';

export function isSharedValue<T = unknown>(
  value: unknown
): value is SharedValue<T> {
  'worklet';
  return (value as Record<string, unknown>)?._isReanimatedSharedValue === true;
}
