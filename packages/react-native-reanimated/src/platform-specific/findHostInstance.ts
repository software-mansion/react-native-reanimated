/* eslint-disable camelcase */
'use strict';

import { HostInstance } from '../commonTypes';
import type { IChildComponentClassWrapper, ICSSAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';
import { ReanimatedError } from '../errors';

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
  try {
    const ReactFabric = require('react-native/Libraries/Renderer/shims/ReactFabric');
    // Since RN 0.77 ReactFabric exports findHostInstance_DEPRECATED in default object so we're trying to
    // access it first, then fallback on named export
    findHostInstance_DEPRECATED =
      ReactFabric?.default?.findHostInstance_DEPRECATED ??
      ReactFabric?.findHostInstance_DEPRECATED;
  } catch (e) {
    throw new ReanimatedError('Failed to resolve findHostInstance_DEPRECATED');
  }
}

let findHostInstance_DEPRECATED: (ref: unknown) => HostInstance;
export function findHostInstance(
  component: ICSSAnimatedComponentInternal
): HostInstance | null {
  // Fast path for native refs
  const hostInstance = findHostInstanceFastPath(
    (component._componentRef as IChildComponentClassWrapper)?.innerComponentRef as HostInstance
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
  return findHostInstance_DEPRECATED(component._componentRef);
}
