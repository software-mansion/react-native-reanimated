'use strict';

import { ReanimatedError } from './errors';

export function getShadowNodeWrapperFromRef() {
  throw new ReanimatedError(
    'Trying to call `getShadowNodeWrapperFromRef` on web.'
  );
}
