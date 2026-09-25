'use strict';

import { isWorkletRuntime } from '../runtimeKind';
import { scheduleOnRN } from '../threads';

export type LazyBundleRegistrar = (requestUrl: string) => void;

type MetroModule = {
  verboseName?: string;
  hot?: { _didAccept: boolean };
};

type MetroDefine = (
  factory: unknown,
  moduleId: number,
  dependencyMap: unknown,
  ...rest: unknown[]
) => void;

const FALLBACK_DEV_SERVER_URL = 'http://localhost:8081/';

const loadPromisesByUrl = new Map<string, Promise<void>>();

const chunkRootIds = new Set<number>();

let definedModuleIds: number[] | null = null;

/**
 * Installs Metro's `__loadBundleAsync` on a Worklet Runtime, so `import()` of a
 * lazy chunk fetches the chunk with the runtime's own `fetch` and evaluates it
 * on that runtime. This mirrors what `loadBundleFromServer` does on the RN
 * Runtime.
 *
 * Use only in dev builds in Bundle Mode.
 */
export function installLazyBundleLoader() {
  if (!isWorkletRuntime()) {
    throw new Error(
      '[Worklets] installLazyBundleLoader can be used only on Worklet Runtimes.'
    );
  }

  const prefix = globalThis.__METRO_GLOBAL_PREFIX__ ?? '';
  const global = globalThis as unknown as Record<string, unknown>;
  const loaderName = `${prefix}__loadBundleAsync`;
  if (global[loaderName] !== undefined) {
    return;
  }
  global[loaderName] = loadBundleFromServer;

  const defineName = `${prefix}__d`;
  const define = global[defineName] as MetroDefine;
  global[defineName] = function (
    this: unknown,
    factory: unknown,
    moduleId: number,
    dependencyMap: unknown,
    ...rest: unknown[]
  ) {
    if (chunkRootIds.has(moduleId)) {
      acceptHotUpdates(moduleId);
    }
    define.call(this, factory, moduleId, dependencyMap, ...rest);
    definedModuleIds?.push(moduleId);
  };
}

/**
 * Creates, on the RN Runtime, the function that a Worklet Runtime calls through
 * `scheduleOnRN` after it has loaded a lazy chunk. The function registers the
 * chunk with the HMR client of the RN Runtime, so edits to the modules of that
 * chunk are propagated to all runtimes.
 */
export function makeLazyBundleRegistrar(): LazyBundleRegistrar | undefined {
  if (!__DEV__ || !globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    return undefined;
  }
  return registerLazyBundleOnRN;
}

/** Stores the registrar received from the RN Runtime on a Worklet Runtime. */
export function installLazyBundleRegistrar(
  registrar: LazyBundleRegistrar | undefined
) {
  'worklet';
  if (registrar) {
    globalThis.__workletsLazyBundleRegistrar = registrar;
  }
}

function registerLazyBundleOnRN(requestUrl: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HMRClient = require('react-native/Libraries/Utilities/HMRClient') as {
    default: { registerBundle: (requestUrl: string) => void };
  };
  HMRClient.default.registerBundle(requestUrl);
}

function loadBundleFromServer(bundlePathAndQuery: string): Promise<void> {
  const requestUrl = buildUrlForBundle(bundlePathAndQuery);
  const pendingLoad = loadPromisesByUrl.get(requestUrl);
  if (pendingLoad) {
    return pendingLoad;
  }

  const load = fetch(requestUrl)
    .then(async (response) => {
      const body = await response.text();
      if (response.headers.get('Content-Type')?.includes('application/json')) {
        const message =
          (JSON.parse(body) as { message?: string }).message ?? 'unknown error';
        throw new Error(
          `[Worklets] Could not load the bundle "${requestUrl}" on the ${globalThis.__RUNTIME_NAME} Runtime: ${message}`
        );
      }
      registerLazyBundle(requestUrl);
      const moduleIds = evaluateBundle(body, requestUrl);
      markChunkRoot(moduleIds, bundlePathAndQuery);
      return undefined;
    })
    .catch((error: unknown) => {
      loadPromisesByUrl.delete(requestUrl);
      throw error;
    });

  loadPromisesByUrl.set(requestUrl, load);
  return load;
}

function buildUrlForBundle(bundlePathAndQuery: string) {
  const serverUrl =
    globalThis._WORKLETS_SOURCE_URL?.match(/^https?:\/\/.*?\//)?.[0] ??
    FALLBACK_DEV_SERVER_URL;
  return (
    serverUrl.replace(/\/+$/, '') + '/' + bundlePathAndQuery.replace(/^\/+/, '')
  );
}

function registerLazyBundle(requestUrl: string) {
  const registrar = globalThis.__workletsLazyBundleRegistrar;
  if (registrar) {
    scheduleOnRN(registrar, requestUrl);
  }
}

function evaluateBundle(body: string, requestUrl: string): number[] {
  const moduleIds: number[] = [];
  definedModuleIds = moduleIds;
  try {
    if (globalThis.evalWithSourceUrl) {
      globalThis.evalWithSourceUrl(body, requestUrl);
    } else {
      // eslint-disable-next-line no-eval
      globalThis.eval(body);
    }
  } finally {
    definedModuleIds = null;
  }
  return moduleIds;
}

/**
 * A Worklet Runtime has no React Refresh boundaries, so Metro's hot update
 * algorithm bails out for every module whose parents chain ends without a
 * boundary. The root of a lazy chunk has no parents at all. Marking it as
 * accepting its own updates gives the chunk a boundary at its root: an edit to
 * any module of the chunk re-runs the modules between it and the root, and the
 * next `import()` returns the fresh exports.
 */
function markChunkRoot(moduleIds: number[], bundlePathAndQuery: string) {
  const chunkPath = bundlePathAndQuery
    .replace(/\?.*$/, '')
    .replace(/^\/+/, '')
    .replace(/\.bundle$/, '');
  const modules = getMetroModules();
  const rootId = moduleIds.find((moduleId) => {
    const verboseName = modules.get(moduleId)?.verboseName;
    return verboseName?.replace(/\.[^/.]+$/, '') === chunkPath;
  });
  if (rootId === undefined) {
    return;
  }
  chunkRootIds.add(rootId);
  acceptHotUpdates(rootId);
}

function acceptHotUpdates(moduleId: number) {
  const hot = getMetroModules().get(moduleId)?.hot;
  if (hot) {
    hot._didAccept = true;
  }
}

function getMetroModules(): Map<number, MetroModule> {
  return (
    globalThis.__r as unknown as { getModules: () => Map<number, MetroModule> }
  ).getModules();
}
