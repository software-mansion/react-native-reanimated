'use strict';

/** @type {((name: string) => unknown) | undefined} */
let get;
/** @type {((name: string) => unknown) | undefined} */
let getEnforcing;

if (
  globalThis.__RUNTIME_KIND === undefined ||
  globalThis.__RUNTIME_KIND === 1
) {
  globalThis.__RUNTIME_KIND = 1;

  const TurboModuleRegistry = require('react-native/Libraries/TurboModule/TurboModuleRegistry');

  get = TurboModuleRegistry.get;
  getEnforcing = TurboModuleRegistry.getEnforcing;
} else {
  /** @type {Map<string, unknown> | undefined} */
  let TurboModulesPolyfill;

  if (
    globalThis.__workletsModuleProxy.getStaticFeatureFlag(
      'FETCH_PREVIEW_ENABLED'
    )
  ) {
    TurboModulesPolyfill = new Map();
    TurboModulesPolyfill.set('Networking', {});

    globalThis.TurboModules = TurboModulesPolyfill;
  }

  function getPolyfill(/** @type {string} */ name) {
    if (__DEV__ && !TurboModulesPolyfill?.has(name)) {
      throw new Error(
        '[Worklets] Accessing TurboModules is not allowed on Worklet Runtimes.'
      );
    } else {
      return TurboModulesPolyfill?.get(name);
    }
  }

  get = getPolyfill;
  getEnforcing = getPolyfill;
}

export { get, getEnforcing };
