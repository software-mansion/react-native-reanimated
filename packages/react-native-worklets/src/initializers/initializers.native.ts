'use strict';

import { setupCallGuard } from '../callGuard';
import { registerReportFatalRemoteError } from '../debug/errors';
import { registerWorkletsError, WorkletsError } from '../debug/WorkletsError';
import { bundleValueUnpacker } from '../memory/bundleUnpacker';
import { __installUnpacker as installCustomSerializableUnpacker } from '../memory/customSerializableUnpacker';
import { makeShareableCloneOnUIRecursive } from '../memory/serializable';
import { __installUnpacker as installSynchronizableUnpacker } from '../memory/synchronizableUnpacker';
import { setupSetImmediate } from '../runLoop/common/setImmediatePolyfill';
import { setupSetInterval } from '../runLoop/common/setIntervalPolyfill';
import { setupRequestAnimationFrame } from '../runLoop/uiRuntime/requestAnimationFrame';
import { setupSetTimeout } from '../runLoop/uiRuntime/setTimeoutPolyfill';
import { RuntimeKind } from '../runtimeKind';
import { runOnUISync, scheduleOnRN, setupMicrotasks } from '../threads';
import type { ValueUnpacker } from '../types';
import { isWorkletFunction } from '../workletFunction';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';

if (globalThis.__RUNTIME_KIND === undefined) {
  // The only runtime that doesn't have `__RUNTIME_KIND` preconfigured
  // is the RN Runtime. We must set it as soon as possible.
  globalThis.__RUNTIME_KIND = RuntimeKind.ReactNative;
}

let capturableConsole: typeof console;

/**
 * Currently there seems to be a bug in the JSI layer which causes a crash when
 * we try to copy some of the console methods, i.e. `clear` or `dirxml`.
 *
 * The crash happens only in React Native 0.75. It's not reproducible in neither
 * 0.76 nor 0.74. It also happens only in the configuration of a debug app and
 * production bundle.
 *
 * I haven't yet discovered what exactly causes the crash. It's tied to the
 * console methods sometimes being `HostFunction`s. Therefore, as a workaround
 * we don't copy the methods as they are in the original console object, we copy
 * JavaScript wrappers instead.
 */
export function getMemorySafeCapturableConsole(): typeof console {
  if (capturableConsole) {
    return capturableConsole;
  }

  const consoleCopy = Object.fromEntries(
    Object.entries(console).map(([methodName, method]) => {
      const methodWrapper = function methodWrapper(...args: unknown[]) {
        return method(...args);
      };
      if (method.name) {
        /**
         * Set the original method name as the wrapper name if available.
         *
         * It might be unnecessary but if we want to fully mimic the console
         * object we should take into the account the fact some code might rely
         * on the method name.
         */
        Object.defineProperty(methodWrapper, 'name', {
          value: method.name,
          writable: false,
        });
      }
      return [methodName, methodWrapper];
    })
  );

  capturableConsole = consoleCopy as unknown as typeof console;

  return consoleCopy as unknown as typeof console;
}

export function setupConsole(boundCapturableConsole: typeof console) {
  'worklet';
  // @ts-ignore TypeScript doesn't like that there are missing methods in console object, but we don't provide all the methods for the UI runtime console version
  globalThis.console = {
    assert: (...args) => scheduleOnRN(boundCapturableConsole.assert, ...args),
    debug: (...args) => scheduleOnRN(boundCapturableConsole.debug, ...args),
    log: (...args) => scheduleOnRN(boundCapturableConsole.log, ...args),
    warn: (...args) => scheduleOnRN(boundCapturableConsole.warn, ...args),
    error: (...args) => scheduleOnRN(boundCapturableConsole.error, ...args),
    info: (...args) => scheduleOnRN(boundCapturableConsole.info, ...args),
  };
}

export function setupSerializer() {
  'worklet';
  globalThis.__serializer = makeShareableCloneOnUIRecursive;
}

let initialized = false;

export function init() {
  if (initialized) {
    return;
  }
  initialized = true;

  initializeRuntime();

  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    initializeWorkletRuntime();
  } else {
    initializeRNRuntime();
    installRNBindingsOnUIRuntime();
  }
}

/** A function that should be run on any kind of runtime. */
function initializeRuntime() {
  if (globalThis._WORKLETS_BUNDLE_MODE) {
    globalThis.__valueUnpacker = bundleValueUnpacker as ValueUnpacker;
  }
  installSynchronizableUnpacker();
  installCustomSerializableUnpacker();
}

/** A function that should be run only on React Native runtime. */
function initializeRNRuntime() {
  if (__DEV__) {
    const testWorklet = () => {
      'worklet';
    };
    if (!isWorkletFunction(testWorklet)) {
      throw new WorkletsError(
        `Failed to create a worklet. See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#failed-to-create-a-worklet for more details.`
      );
    }
  }

  registerReportFatalRemoteError();
}

/** A function that should be run only on Worklet runtimes. */
function initializeWorkletRuntime() {
  if (globalThis._WORKLETS_BUNDLE_MODE) {
    setupCallGuard();

    if (__DEV__) {
      /*
       * Temporary workaround for Metro bundler. We must implement a dummy
       * Refresh module to prevent Metro from throwing irrelevant errors.
       */
      const Refresh = new Proxy(
        {},
        {
          get() {
            return () => {};
          },
        }
      );

      globalThis.__r.Refresh = Refresh;

      /* Gracefully handle unwanted imports from React Native. */
      const modules = require.getModules();
      const ReactNativeModuleId = require.resolveWeak('react-native');

      const factory = function (
        _global: unknown,
        _require: unknown,
        _importDefault: unknown,
        _importAll: unknown,
        module: Record<string, unknown>,
        _exports: unknown,
        _dependencyMap: unknown
      ) {
        module.exports = new Proxy(
          {},
          {
            get: function get(_target, prop) {
              globalThis.console.warn(
                `You tried to import '${String(prop)}' from 'react-native' module on a Worklet Runtime. Using 'react-native' module on a Worklet Runtime is not allowed.`
              );
              return {
                get() {
                  return undefined;
                },
              };
            },
          }
        );
      };

      const mod = {
        dependencyMap: [],
        factory,
        hasError: false,
        importedAll: {},
        importedDefault: {},
        isInitialized: false,
        publicModule: {
          exports: {},
        },
      };

      modules.set(ReactNativeModuleId, mod);
    }
  }
}

/**
 * A function that should be run on the RN Runtime to configure the UI Runtime
 * with callback bindings.
 */
function installRNBindingsOnUIRuntime() {
  if (!WorkletsModule) {
    throw new WorkletsError(
      'Worklets are trying to initialize the UI runtime without a valid WorkletsModule'
    );
  }

  const runtimeBoundCapturableConsole = getMemorySafeCapturableConsole();

  if (!globalThis._WORKLETS_BUNDLE_MODE) {
    /** In bundle mode Runtimes setup their callGuard themselves. */
    runOnUISync(setupCallGuard);

    /** In Bundle Mode the error is taken from the bundle. */
    runOnUISync(registerWorkletsError);

    /** In Bundle Mode the serializer is taken from the bundle. */
    runOnUISync(setupSerializer);
  }

  runOnUISync(() => {
    'worklet';

    setupConsole(runtimeBoundCapturableConsole);
    /**
     * TODO: Move `setupMicrotasks` and `setupRequestAnimationFrame` to a
     * separate function once we have a better way to distinguish between
     * Worklet Runtimes.
     */
    setupMicrotasks();
    setupRequestAnimationFrame();
    setupSetTimeout();
    setupSetImmediate();
    setupSetInterval();
  });
}
