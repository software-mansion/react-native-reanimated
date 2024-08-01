'use strict';

import { logger } from './logger';

export function getShadowNodeWrapperFromRef() {
  throw logger.createError(
    'Trying to call `getShadowNodeWrapperFromRef` on web.'
  );
}
