'use strict';

import type { InternalHostInstance, ShadowNodeWrapper } from './commonTypes';
import { findHostInstance } from './platform-specific/findHostInstance';
import type { HostInstance } from './platform-specific/types';

type GetNodeFromPublicInstance = (
  publicInstance: HostInstance
) => ShadowNodeWrapper | null | undefined;

function getNodeFromPublicInstanceFallback(publicInstance: HostInstance) {
  return (
    publicInstance?.__internalInstanceHandle?.stateNode as
      | { node?: ShadowNodeWrapper }
      | undefined
  )?.node;
}

function resolveGetNodeFromPublicInstance(): GetNodeFromPublicInstance {
  try {
    const ReactFabricPublicInstance =
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      require('react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactFabricPublicInstance');
    return (
      ReactFabricPublicInstance?.getNodeFromPublicInstance ??
      ReactFabricPublicInstance?.default?.getNodeFromPublicInstance ??
      getNodeFromPublicInstanceFallback
    );
  } catch (_e) {
    return getNodeFromPublicInstanceFallback;
  }
}

const getNodeFromPublicInstance = resolveGetNodeFromPublicInstance();

function resolvePublicInstance(
  ref: InternalHostInstance,
  hostInstance?: HostInstance
): HostInstance {
  if (hostInstance?.__internalInstanceHandle) {
    return hostInstance;
  }
  if (ref?.__internalInstanceHandle) {
    return ref as HostInstance;
  }
  const nativeScrollRef = ref.getNativeScrollRef?.();
  if (nativeScrollRef) {
    return nativeScrollRef as HostInstance;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((ref as any)._reactInternals) {
    return findHostInstance(ref);
  }
  throw new Error(`[Reanimated] Failed to find host instance for a ref.`);
}

export function getShadowNodeWrapperFromRef(
  ref: InternalHostInstance,
  hostInstance?: HostInstance
): ShadowNodeWrapper {
  const publicInstance = resolvePublicInstance(ref, hostInstance);
  const shadowNodeWrapper = getNodeFromPublicInstance(publicInstance);

  if (!shadowNodeWrapper) {
    throw new Error(`[Reanimated] Failed to find shadow node for a ref.`);
  }

  return shadowNodeWrapper;
}
