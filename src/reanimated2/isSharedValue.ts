'use strict';
import type { SharedValue } from './commonTypes';

export function isSharedValue<T>(value: any): value is SharedValue<T> {
  'worklet';
  return value?._isReanimatedSharedValue === true;
}
