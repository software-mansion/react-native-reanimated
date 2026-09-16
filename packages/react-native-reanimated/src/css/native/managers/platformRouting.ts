'use strict';
import type { UnknownRecord } from '../../../common';

/**
 * Whether the platform can show transitions routed to it for a view with this
 * style. Only iOS has a rendering rule to check.
 */
export function supportsPlatformRouting(_style: UnknownRecord): boolean {
  return true;
}
