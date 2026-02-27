'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import type { Shareable } from './types';

export function isShareable<
  TValue,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
>(
  _value: unknown
): _value is Shareable<TValue, THostDecorated, TGuestDecorated> {
  throw new WorkletsError('`isShareable` is not supported on web.');
}
