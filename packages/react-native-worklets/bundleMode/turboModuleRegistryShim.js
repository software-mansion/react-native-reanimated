'use strict';

let get;
let getEnforcing;

if (  (globalThis.__RUNTIME_KIND === 2 || globalThis.__RUNTIME_KIND === 3) &&
  /** @type {any} */ (globalThis.__workletsModuleProxy).getStaticFeatureFlag('FETCH_PREVIEW_ENABLED')) {
  const TurboModules = new Map();
  TurboModules.set('Networking', {});

  get = (/** @type {string} */ name) => TurboModules.get(name);
  getEnforcing = (/** @type {string} */ name) => TurboModules.get(name);

  globalThis.TurboModules = TurboModules;
} else {
  const TurboModuleRegistry = require('react-native/Libraries/TurboModule/TurboModuleRegistry');

  get = TurboModuleRegistry.get;
  getEnforcing = TurboModuleRegistry.getEnforcing;
}

export { get, getEnforcing };
