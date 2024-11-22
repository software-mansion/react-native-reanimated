/* eslint-disable camelcase */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
'use strict';

import { isFabric } from '../PlatformChecker';

function findHostInstanceFastPath(ref: React.Component) {
  if (ref.__internalInstanceHandle && ref.__nativeTag && ref._viewConfig) {
    return ref;
  }
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
      findHostInstance_DEPRECATED = (_ref: unknown) => null;
    }
  } else {
    findHostInstance_DEPRECATED =
      require('react-native/Libraries/Renderer/shims/ReactNative').findHostInstance_DEPRECATED;
  }
}

let findHostInstance_DEPRECATED: (ref: unknown) => void;
export function findHostInstance(component: React.Component): unknown {
  // Fast path for native refs
  const hostInstance = findHostInstanceFastPath(component._componentRef);
  if (hostInstance !== undefined) {
    return hostInstance;
  }

  resolveFindHostInstance_DEPRECATED();
  return findHostInstance_DEPRECATED(
    isFabric() ? component : component._componentRef
  );
}
