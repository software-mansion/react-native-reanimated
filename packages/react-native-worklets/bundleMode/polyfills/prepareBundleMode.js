'use strict';

const reactNativeRuntimeKind = 1;

if (
  globalThis.__RUNTIME_KIND === undefined ||
  globalThis.__RUNTIME_KIND === reactNativeRuntimeKind
) {
  const workletsModule = globalThis.__turboModuleProxy
    ? globalThis.__turboModuleProxy('WorkletsModule')
    : globalThis.nativeModuleProxy?.WorkletsModule;
  workletsModule?.prepareBundleMode?.();
}
