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
      const nativeScrollRef = ref.getNativeScrollRef();
      if (nativeScrollRef) {
        resolvedInstance = (nativeScrollRef as any)
          .__internalInstanceHandle;
      }
    }
    if (!resolvedInstance && (ref as any)._reactInternals) {
      resolvedInstance = findHostInstance(ref).__internalInstanceHandle;
    }
    if (!resolvedInstance) {
      throw new ReanimatedError(`Failed to find host instance for a ref.}`);
    }
  }

  return resolvedInstance!.stateNode.node as ShadowNodeWrapper;
}
