/* eslint-disable camelcase */
'use strict';

import type { InternalHostInstance } from '../commonTypes';
import type { IAnimatedComponentInternalBase } from '../createAnimatedComponent/commonTypes';
import type { HostInstance } from './types';

function findHostInstanceFastPath(maybeNativeRef: HostInstance | undefined) {
  if (!maybeNativeRef) {
    return undefined;
  }
  if (
    maybeNativeRef.__internalInstanceHandle &&
    maybeNativeRef.__nativeTag &&
    maybeNativeRef.__viewConfig
  ) {
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const ReactFabric = require('react-native/Libraries/Renderer/shims/ReactFabric');
    // Since RN 0.77 ReactFabric exports findHostInstance_DEPRECATED in default object so we're trying to
    // access it first, then fallback on named export
    findHostInstance_DEPRECATED =
      ReactFabric?.default?.findHostInstance_DEPRECATED ??
      ReactFabric?.findHostInstance_DEPRECATED;
  } catch (_e) {
    throw new Error(
      '[Reanimated] Failed to resolve findHostInstance_DEPRECATED'
    );
  }
}

let findHostInstance_DEPRECATED: (ref: unknown) => HostInstance;
export function findHostInstance(
  ref: IAnimatedComponentInternalBase | InternalHostInstance
): HostInstance {
  // Fast path for native refs
  const hostInstance = findHostInstanceFastPath(
    (ref as IAnimatedComponentInternalBase)._componentRef as HostInstance
  );
  if (hostInstance !== undefined) {
    return hostInstance;
  }

  resolveFindHostInstance_DEPRECATED();
  /*
    The Fabric implementation of `findHostInstance_DEPRECATED` requires a React ref as an argument
    rather than a native ref. Prefer the resolved component ref when available so components can
    forward their ref to the host view that should be animated. Components that expose an animatable
    ref via `getAnimatableRef` already have it resolved into `_componentRef`.
  */
  return findHostInstance_DEPRECATED(
    (ref as IAnimatedComponentInternalBase)._componentRef ?? ref
  );
}
