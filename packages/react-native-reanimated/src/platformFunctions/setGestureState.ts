'use strict';

import { logger } from '../common';

// Signature matches the native one (handlerTag, newState) so consumer
// type-checks stay consistent across platforms; the runtime impl just
// warns and ignores the args because gesture state isn't reachable on web.
export function setGestureState(_handlerTag: number, _newState: number) {
  logger.warn('setGestureState() is not available on web.');
}
