'use strict';

globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;

const reactNativeRuntimeKind = 1;

if (
  globalThis._WORKLETS_BUNDLE_MODE_ENABLED &&
  (globalThis.__RUNTIME_KIND === undefined ||
    globalThis.__RUNTIME_KIND === reactNativeRuntimeKind)
) {
  const workletsModule = globalThis.__turboModuleProxy
    ? globalThis.__turboModuleProxy('WorkletsModule')
    : globalThis.nativeModuleProxy?.WorkletsModule;
  workletsModule?.prepareBundleMode?.();
}
