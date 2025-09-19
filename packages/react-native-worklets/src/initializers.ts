'use strict';

import { bundleValueUnpacker } from './bundleUnpacker';
import { setupCallGuard } from './callGuard';
import { registerReportFatalRemoteError } from './errors';
import { IS_JEST, SHOULD_BE_USE_WEB } from './PlatformChecker';
import { setupSetImmediate } from './runLoop/common/setImmediatePolyfill';
import { setupSetInterval } from './runLoop/common/setIntervalPolyfill';
import { mockedRequestAnimationFrame } from './runLoop/uiRuntime/mockedRequestAnimationFrame';
import { setupRequestAnimationFrame } from './runLoop/uiRuntime/requestAnimationFrame';
import { setupSetTimeout } from './runLoop/uiRuntime/setTimeoutPolyfill';
import { RuntimeKind } from './runtimeKind';
import { __installUnpacker as installSynchronizableUnpacker } from './synchronizableUnpacker';
import { executeOnUIRuntimeSync, runOnJS, setupMicrotasks } from './threads';
import { isWorkletFunction } from './workletFunction';
import { registerWorkletsError, WorkletsError } from './WorkletsError';
import { WorkletsModule } from './WorkletsModule';
import type { ValueUnpacker } from './workletTypes';

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
    assert: runOnJS(boundCapturableConsole.assert),
    debug: runOnJS(boundCapturableConsole.debug),
    log: runOnJS(boundCapturableConsole.log),
    warn: runOnJS(boundCapturableConsole.warn),
    error: runOnJS(boundCapturableConsole.error),
    info: runOnJS(boundCapturableConsole.info),
  };
}

let initialized = false;

export function init() {
  if (initialized) {
    return;
  }
  initialized = true;

  if (globalThis.__RUNTIME_KIND === undefined) {
    // The only runtime that doesn't have `__RUNTIME_KIND` preconfigured
    // is the RN Runtime. We must set it as soon as possible.
    globalThis.__RUNTIME_KIND = RuntimeKind.ReactNative;
  }

  initializeRuntime();

  if (SHOULD_BE_USE_WEB) {
    initializeRuntimeOnWeb();
  }

  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    initializeWorkletRuntime();
  } else {
    initializeRNRuntime();
    if (!SHOULD_BE_USE_WEB) {
      installRNBindingsOnUIRuntime();
    }
  }
}

/** A function that should be run on any kind of runtime. */
function initializeRuntime() {
  if (globalThis._WORKLETS_BUNDLE_MODE) {
    globalThis.__valueUnpacker = bundleValueUnpacker as ValueUnpacker;
  }
  installSynchronizableUnpacker();
}

/** A function that should be run only on React Native runtime. */
function initializeRNRuntime() {
  if (__DEV__ && !SHOULD_BE_USE_WEB) {
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
      // @ts-expect-error type not exposed by Metro
      const modules = require.getModules();
      // @ts-expect-error type not exposed by Metro
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

/** A function that should be run only on RN Runtime in web implementation. */
function initializeRuntimeOnWeb() {
  globalThis._WORKLET = false;
  globalThis._log = console.log;
  globalThis._getAnimationTimestamp = () => performance.now();
  if (IS_JEST) {
    // requestAnimationFrame react-native jest's setup is incorrect as it polyfills
    // the method directly using setTimeout, therefore the callback doesn't get the
    // expected timestamp as the only argument: https://github.com/facebook/react-native/blob/main/packages/react-native/jest/setup.js#L28
    // We override this setup here to make sure that callbacks get the proper timestamps
    // when executed. For non-jest environments we define requestAnimationFrame in setupRequestAnimationFrame
    // @ts-ignore TypeScript uses Node definition for rAF, setTimeout, etc which returns a Timeout object rather than a number
    globalThis.requestAnimationFrame = mockedRequestAnimationFrame;
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
    executeOnUIRuntimeSync(setupCallGuard)();

    /**
     * Register WorkletsError in the UI runtime global scope. (we are using
     * `executeOnUIRuntimeSync` here to make sure that the changes are applied
     * before any async operations are executed on the UI runtime).
     *
     * There's no need to register the error in bundle mode.
     */
    executeOnUIRuntimeSync(registerWorkletsError)();
  }

  executeOnUIRuntimeSync(() => {
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
  })();
}
