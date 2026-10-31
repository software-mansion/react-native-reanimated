'use strict';

import { createSerializable } from '../memory/serializable';
import { isWorkletRuntime, RuntimeKind } from '../runtimeKind';
import { scheduleOnRN } from '../threads';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';

export type LazyBundleRegistrar = (requestUrl: string) => void;

export type LazyBundle = [bundlePathAndQuery: string, body: string];

type LazyBundleLoader = (bundlePathAndQuery: string) => Promise<void>;

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

const evaluatedUrls = new Set<string>();

const chunkRootIds = new Set<number>();

const lazyBundleBodiesByPath = new Map<string, string>();

const propagationsByPath = new Map<string, Promise<void>>();

const workerRuntimeIds = new Set<number>();

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
  globalThis.__workletsEvaluateLazyBundle = evaluateLazyBundle;

  const defineName = `${prefix}__d`;
  const define = global[defineName] as MetroDefine;
  global[defineName] = function (
    this: unknown,
    factory: unknown,
    moduleId: number,
    dependencyMap: unknown,
    ...rest: unknown[]
  ) {
    chunkRootIds.forEach(acceptHotUpdates);
    define.call(this, factory, moduleId, dependencyMap, ...rest);
    definedModuleIds?.push(moduleId);
  };
}

/**
 * Wraps Metro's `__loadBundleAsync` on the RN Runtime, so a lazy chunk that the
 * RN Runtime loads is also evaluated on the UI Runtime and on every Worker
 * Runtime with a queue and locking before the `import()` promise resolves.
 * Worklets defined in the chunk can then be resolved on these runtimes. The
 * chunk is also kept for Worker Runtimes created later, see
 * {@link getLoadedLazyBundles}.
 *
 * Use only in dev builds in Bundle Mode.
 */
export function installLazyBundlePropagation() {
  const global = globalThis as unknown as Record<string, unknown>;
  const loaderName = `${globalThis.__METRO_GLOBAL_PREFIX__ ?? ''}__loadBundleAsync`;
  let loader = propagateLazyBundles(
    global[loaderName] as LazyBundleLoader | undefined
  );
  Object.defineProperty(global, loaderName, {
    configurable: true,
    enumerable: true,
    get: () => loader,
    set: (newLoader: LazyBundleLoader | undefined) => {
      loader = propagateLazyBundles(newLoader);
    },
  });
}

/**
 * Adds a Worker Runtime to the runtimes that evaluate the lazy chunks loaded by
 * the RN Runtime.
 */
export function registerWorkerRuntimeForLazyBundles(runtimeId: number) {
  if (__DEV__ && globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    workerRuntimeIds.add(runtimeId);
  }
}

/**
 * Returns the lazy chunks that the RN Runtime has loaded so far, so a new
 * Worker Runtime can evaluate them before its initializer runs.
 */
export function getLoadedLazyBundles(): LazyBundle[] {
  if (!__DEV__ || !globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    return [];
  }
  return Array.from(lazyBundleBodiesByPath.entries());
}

/** Evaluates lazy chunks on the current Worklet Runtime. */
export function evaluateLazyBundles(lazyBundles: LazyBundle[]) {
  'worklet';
  for (const [bundlePathAndQuery, body] of lazyBundles) {
    globalThis.__workletsEvaluateLazyBundle!(bundlePathAndQuery, body);
  }
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
      if (!evaluatedUrls.has(requestUrl)) {
        registerLazyBundle(requestUrl);
        evaluateChunk(body, requestUrl, bundlePathAndQuery);
      }
      return undefined;
    })
    .catch((error: unknown) => {
      loadPromisesByUrl.delete(requestUrl);
      throw error;
    });

  loadPromisesByUrl.set(requestUrl, load);
  return load;
}

function evaluateLazyBundle(bundlePathAndQuery: string, body: string) {
  const requestUrl = buildUrlForBundle(bundlePathAndQuery);
  if (evaluatedUrls.has(requestUrl)) {
    return;
  }
  evaluateChunk(body, requestUrl, bundlePathAndQuery);
  loadPromisesByUrl.set(requestUrl, Promise.resolve());
}

function evaluateChunk(
  body: string,
  requestUrl: string,
  bundlePathAndQuery: string
) {
  const moduleIds = evaluateBundle(body, requestUrl);
  evaluatedUrls.add(requestUrl);
  markChunkRoot(moduleIds, bundlePathAndQuery);
}

function propagateLazyBundles(
  loader: LazyBundleLoader | undefined
): LazyBundleLoader | undefined {
  if (!loader) {
    return loader;
  }
  return (bundlePathAndQuery: string) => {
    const pendingPropagation = propagationsByPath.get(bundlePathAndQuery);
    if (pendingPropagation) {
      return pendingPropagation;
    }
    const propagation = Promise.all([
      loader(bundlePathAndQuery),
      fetchLazyBundleOnRN(bundlePathAndQuery),
    ])
      .then(([, body]) => {
        lazyBundleBodiesByPath.set(bundlePathAndQuery, body);
        return evaluateOnWorkletRuntimes(bundlePathAndQuery, body);
      })
      .catch((error: unknown) => {
        propagationsByPath.delete(bundlePathAndQuery);
        throw error;
      });
    propagationsByPath.set(bundlePathAndQuery, propagation);
    return propagation;
  };
}

async function fetchLazyBundleOnRN(bundlePathAndQuery: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const getDevServer =
    require('react-native/Libraries/Core/Devtools/getDevServer') as {
      default: () => { url: string };
    };
  const serverUrl = getDevServer.default().url;
  const requestUrl =
    serverUrl.replace(/\/+$/, '') +
    '/' +
    bundlePathAndQuery.replace(/^\/+/, '');
  const response = await fetch(requestUrl);
  const body = await response.text();
  if (
    !response.ok ||
    response.headers.get('Content-Type')?.includes('application/json')
  ) {
    throw new Error(
      `[Worklets] Could not load the bundle "${requestUrl}" on the RN Runtime: ${getMetroErrorMessage(body, response.status)}`
    );
  }
  return body;
}

function getMetroErrorMessage(body: string, status: number) {
  try {
    const { message } = JSON.parse(body) as { message?: string };
    return message ?? `HTTP ${status}`;
  } catch {
    return `HTTP ${status}`;
  }
}

async function evaluateOnWorkletRuntimes(
  bundlePathAndQuery: string,
  body: string
) {
  const runtimeIds = [RuntimeKind.UI as number, ...workerRuntimeIds];
  await Promise.all(
    runtimeIds.map((runtimeId) =>
      evaluateOnWorkletRuntime(runtimeId, bundlePathAndQuery, body)
    )
  );
}

function evaluateOnWorkletRuntime(
  runtimeId: number,
  bundlePathAndQuery: string,
  body: string
) {
  return new Promise<void>((resolve, reject) => {
    const onEvaluated = (errorMessage?: string) => {
      if (errorMessage === undefined) {
        resolve();
      } else {
        reject(
          new Error(
            `[Worklets] Could not evaluate the bundle "${bundlePathAndQuery}" ${errorMessage}`
          )
        );
      }
    };
    try {
      WorkletsModule.scheduleOnRuntimeWithId(
        runtimeId,
        createSerializable(() => {
          'worklet';
          evaluateLazyBundleJob(bundlePathAndQuery, body, onEvaluated);
        }),
        undefined
      );
    } catch {
      workerRuntimeIds.delete(runtimeId);
      resolve();
    }
  });
}

function evaluateLazyBundleJob(
  bundlePathAndQuery: string,
  body: string,
  onEvaluated: (errorMessage?: string) => void
) {
  'worklet';
  try {
    globalThis.__workletsEvaluateLazyBundle!(bundlePathAndQuery, body);
    scheduleOnRN(onEvaluated);
  } catch (error) {
    scheduleOnRN(
      onEvaluated,
      `on the ${globalThis.__RUNTIME_NAME} Runtime: ${(error as Error)?.message ?? String(error)}`
    );
  }
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
