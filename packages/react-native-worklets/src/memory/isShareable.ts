'use strict';

import type { Shareable } from './types';

export function isShareable<
  TValue,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
>(value: unknown): value is Shareable<TValue, THostDecorated, TGuestDecorated> {
  'worklet';
  return (
    typeof value === 'object' &&
    value !== null &&
    !!(value as Record<string, unknown>).__shareableRef
  );
}
