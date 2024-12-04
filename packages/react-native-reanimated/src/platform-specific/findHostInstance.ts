/* eslint-disable camelcase */
'use strict';

import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';
import { ReanimatedError } from '../errors';
import { isFabric } from '../PlatformChecker';

type HostInstanceFabric = {
  __internalInstanceHandle?: Record<string, unknown>;
  __nativeTag?: number;
  _viewConfig?: Record<string, unknown>;
};

type HostInstancePaper = {
  _nativeTag?: number;
  viewConfig?: Record<string, unknown>;
};

export type HostInstance = HostInstanceFabric & HostInstancePaper;

function findHostInstanceFastPath(maybeNativeRef: HostInstance) {
  if (
    maybeNativeRef.__internalInstanceHandle &&
    maybeNativeRef.__nativeTag &&
    maybeNativeRef._viewConfig
  ) {
    // This is a native ref to a Fabric component
    return maybeNativeRef;
  }
  if (maybeNativeRef._nativeTag && maybeNativeRef.viewConfig) {
    // This is a native ref to a Paper component
    return maybeNativeRef;
  }
  // That means it’s a ref to a non-native component, and it’s necessary
  // to call `findHostInstance_DEPRECATED` on them.
  return undefined;
}

function resolveFindHostInstance_DEPRECATED() {
  if (findHostInstance_DEPRECATED !== undefined) {
    return;
  }
  if (isFabric()) {
    try {
      findHostInstance_DEPRECATED =
        require('react-native/Libraries/Renderer/shims/ReactFabric').findHostInstance_DEPRECATED;
    } catch (e) {
      throw new ReanimatedError(
        'Failed to resolve findHostInstance_DEPRECATED'
      );
    }
  } else {
    findHostInstance_DEPRECATED =
      require('react-native/Libraries/Renderer/shims/ReactNative').findHostInstance_DEPRECATED;
  }
}

let findHostInstance_DEPRECATED: (ref: unknown) => HostInstance;
export function findHostInstance(
  component: IAnimatedComponentInternal | React.Component
): HostInstance {
  // Fast path for native refs
  const hostInstance = findHostInstanceFastPath(
    (component as IAnimatedComponentInternal)._componentRef as HostInstance
  );
  if (hostInstance !== undefined) {
    return hostInstance;
  }

  resolveFindHostInstance_DEPRECATED();
  // Fabric implementation of findHostInstance_DEPRECATED doesn't accept a ref as an argument
  return findHostInstance_DEPRECATED(
    isFabric()
      ? component
      : (component as IAnimatedComponentInternal)._componentRef
  );
}
