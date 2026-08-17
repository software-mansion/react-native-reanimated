'use strict';

import { logger } from '../common';

export function setGestureState(_handlerTag: number, _newState: number) {
  logger.warn('setGestureState() is not available on web.');
}
