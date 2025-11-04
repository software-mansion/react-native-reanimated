'use strict';
/* eslint-disable */

import type { InternalHostInstance, ShadowNodeWrapper } from './commonTypes';
import {
  findHostInstance,
  HostInstance,
} from './platform-specific/findHostInstance';
import { ReanimatedError } from './errors';

export function getShadowNodeWrapperFromRef(
  ref: React.Component & InternalHostInstance,
  hostInstance?: HostInstance
): ShadowNodeWrapper {
  const resolvedInstance =
    hostInstance?.__internalInstanceHandle ??
    ref?.__internalInstanceHandle ??
    ref?.getNativeScrollRef?.()?.__internalInstanceHandle ??
    (ref._reactInternals && findHostInstance(ref).__internalInstanceHandle);

  if (!resolvedInstance) {
    throw new ReanimatedError('Failed to find host instance for a ref.');
  }

  return (resolvedInstance as any).stateNode.node as ShadowNodeWrapper;
}
