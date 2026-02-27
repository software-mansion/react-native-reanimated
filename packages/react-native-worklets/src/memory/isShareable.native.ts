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
    '__shareableRef' in value &&
    value.__shareableRef === true
  );
}
