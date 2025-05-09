'use strict';

import { ReanimatedError } from './common';

export function getShadowNodeWrapperFromRef() {
  throw new ReanimatedError(
    'Trying to call `getShadowNodeWrapperFromRef` on web.'
  );
}
