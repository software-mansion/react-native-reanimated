'use strict';

import { ReanimatedError } from './common';
import type { InternalHostInstance, ShadowNodeWrapper } from './commonTypes';
import type { HostInstance } from './platform-specific/types';

export function getShadowNodeWrapperFromRef(
  _ref: InternalHostInstance,
  _hostInstance?: HostInstance
): ShadowNodeWrapper {
  throw new ReanimatedError(
    'Trying to call `getShadowNodeWrapperFromRef` on web.'
  );
}
