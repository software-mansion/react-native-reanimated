'use strict';

/**
 * This value is changed to `true` by the Worklets Syntax plugin when Bundle
 * Mode is enabled.
 */
globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;

const reactNativeRuntimeKind = 1;

if (
  globalThis.__RUNTIME_KIND === undefined ||
  globalThis.__RUNTIME_KIND === reactNativeRuntimeKind
) {
  /** @type {typeof globalThis} */ (globalThis).__RUNTIME_KIND =
    reactNativeRuntimeKind;

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    const workletsModule = globalThis.__turboModuleProxy
      ? globalThis.__turboModuleProxy('WorkletsModule')
      : globalThis.nativeModuleProxy?.WorkletsModule;
    workletsModule?.prepareBundleMode?.();
  }
} else if (__DEV__) {
  globalThis.__fbBatchedBridgeConfig = new Proxy(
    {},
    {
      get() {
        throw new Error(
          '[Worklets] Accessing __fbBatchedBridgeConfig is not allowed on Worklet Runtimes. Perhaps you tried to access a Turbo Module?'
        );
      },
    }
  );
}
