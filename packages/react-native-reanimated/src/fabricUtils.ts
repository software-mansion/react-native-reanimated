/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

import { ReanimatedError } from './common/errors';
import type { InternalHostInstance, ShadowNodeWrapper } from './commonTypes';
import { findHostInstance } from './platform-specific/findHostInstance';
import type { HostInstance } from './platform-specific/types';

export function getShadowNodeWrapperFromRef(
  ref: InternalHostInstance,
  hostInstance?: HostInstance
): ShadowNodeWrapper {
  let resolvedInstance =
    hostInstance?.__internalInstanceHandle ?? ref?.__internalInstanceHandle;

  if (!resolvedInstance) {
    if (ref.getNativeScrollRef) {
      resolvedInstance = (ref.getNativeScrollRef() as any)
        .__internalInstanceHandle;
    } else if ((ref as any)._reactInternals) {
      resolvedInstance = findHostInstance(ref).__internalInstanceHandle;
    } else {
      throw new ReanimatedError(`Failed to find host instance for a ref.}`);
    }
  }

  return resolvedInstance!.stateNode.node as ShadowNodeWrapper;
}
