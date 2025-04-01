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

function findHostInstanceFastPath(maybeNativeRef: HostInstance | undefined) {
  if (!maybeNativeRef) {
    return undefined;
  }
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
      const ReactFabric = require('react-native/Libraries/Renderer/shims/ReactFabric');
      // Since RN 0.77 ReactFabric exports findHostInstance_DEPRECATED in default object so we're trying to
      // access it first, then fallback on named export
      findHostInstance_DEPRECATED =
        ReactFabric?.default?.findHostInstance_DEPRECATED ??
        ReactFabric?.findHostInstance_DEPRECATED;
    } catch (e) {
      throw new ReanimatedError(
        'Failed to resolve findHostInstance_DEPRECATED'
      );
    }
  } else {
    const ReactNative = require('react-native/Libraries/Renderer/shims/ReactNative');
    // Since RN 0.77 ReactFabric exports findHostInstance_DEPRECATED in default object so we're trying to
    // access it first, then fallback on named export
    findHostInstance_DEPRECATED =
      ReactNative?.default?.findHostInstance_DEPRECATED ??
      ReactNative?.findHostInstance_DEPRECATED;
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
  /*
    The Fabric implementation of `findHostInstance_DEPRECATED` requires a React ref as an argument
    rather than a native ref. If a component implements the `getAnimatableRef` method, it must use 
    the ref provided by this method. It is the component's responsibility to ensure that this is 
    a valid React ref.
  */
  return findHostInstance_DEPRECATED(
    !isFabric() || (component as IAnimatedComponentInternal)._hasAnimatedRef
      ? (component as IAnimatedComponentInternal)._componentRef
      : component
  );
}
