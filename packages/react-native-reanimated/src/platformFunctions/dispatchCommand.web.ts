'use strict';

import { logger } from 'react-native-worklets';

export function dispatchCommand() {
  logger.warn('dispatchCommand() is not supported on web.');
}
