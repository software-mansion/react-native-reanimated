'use strict';

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
      const scrollRef = ref.getNativeScrollRef() as
        | { __internalInstanceHandle?: typeof resolvedInstance }
        | null
        | undefined;
      resolvedInstance = scrollRef?.__internalInstanceHandle;
    } else if ((ref as { _reactInternals?: unknown })._reactInternals) {
      resolvedInstance = findHostInstance(ref).__internalInstanceHandle;
    } else {
      throw new Error(`[Reanimated] Failed to find host instance for a ref.`);
    }
  }

  return resolvedInstance!.stateNode.node as ShadowNodeWrapper;
}
