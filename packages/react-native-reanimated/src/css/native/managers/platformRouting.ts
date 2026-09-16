'use strict';
import type { UnknownRecord } from '../../../common';
import type { CSSTransitionConfig } from '../types';

/**
 * Whether the platform can show transitions routed to it for a view with this
 * style. Only iOS has a rendering rule to check.
 */
export function supportsPlatformRouting(_style: UnknownRecord): boolean {
  return true;
}

/**
 * Until when the transitions in `config` keep the platform off; 0 when they
 * don't.
 */
export function platformBlockedUntil(
  _config: CSSTransitionConfig,
  _now: number
): number {
  return 0;
}
