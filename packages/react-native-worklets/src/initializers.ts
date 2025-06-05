'use strict';

import { mockedRequestAnimationFrame } from './animationFrameQueue/mockedRequestAnimationFrame';
import { setupRequestAnimationFrame } from './animationFrameQueue/requestAnimationFrame';
import { bundleValueUnpacker } from './bundleUnpacker';
import { setupCallGuard } from './callGuard';
import { reportFatalErrorOnJS } from './errors';
import {
  DEFAULT_LOGGER_CONFIG,
  logToLogBoxAndConsole,
  registerLoggerConfig,
  replaceLoggerImplementation,
} from './logger';
import { IS_JEST, IS_WEB, SHOULD_BE_USE_WEB } from './PlatformChecker';
import { executeOnUIRuntimeSync, runOnJS, setupMicrotasks } from './threads';
import { isWorkletFunction } from './workletFunction';
import { initializeLibraryOnWorkletRuntime } from './workletRuntimeEntry';
import { registerWorkletsError, WorkletsError } from './WorkletsError';
import type { IWorkletsModule } from './WorkletsModule';
import type { ValueUnpacker } from './workletTypes';

if (!globalThis._WORKLET) {
  globalThis.__valueUnpacker = bundleValueUnpacker as ValueUnpacker;
}

// @ts-expect-error We must trick the bundler to include
// the `workletRuntimeEntry` file the way it cannot optimize it out.
if (globalThis._ALWAYS_FALSE) {
  // Experimental bundling.
  initializeLibraryOnWorkletRuntime();
}

// Override the logFunction implementation with the one that adds logs
// with better stack traces to the LogBox (need to override it after `runOnJS`
// is defined).
function overrideLogFunctionImplementation(
  boundLogToLogBoxAndConsole: typeof logToLogBoxAndConsole
) {
  'worklet';
  replaceLoggerImplementation((data) => {
    'worklet';
    runOnJS(boundLogToLogBoxAndConsole)(data);
  });
}

// Register logger config and replace the log function implementation in
// the React runtime global scope
if (!globalThis._WORKLET) {
  registerLoggerConfig(DEFAULT_LOGGER_CONFIG);
  overrideLogFunctionImplementation(logToLogBoxAndConsole);
}

// this is for web implementation
if (SHOULD_BE_USE_WEB) {
  globalThis._WORKLET = false;
  globalThis._log = console.log;
  globalThis._getAnimationTimestamp = () => performance.now();
} else if (!globalThis._WORKLET) {
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

  const runtimeBoundLogToLogBoxAndConsole = logToLogBoxAndConsole;

  // Register WorkletsError and logger config in the UI runtime global scope.
  // (we are using `executeOnUIRuntimeSync` here to make sure that the changes
  // are applied before any async operations are executed on the UI runtime)
  executeOnUIRuntimeSync(registerWorkletsError)();
  executeOnUIRuntimeSync(registerLoggerConfig)(DEFAULT_LOGGER_CONFIG);
  executeOnUIRuntimeSync(overrideLogFunctionImplementation)(
    runtimeBoundLogToLogBoxAndConsole
  );
}

export function setupErrorUtils(
  boundReportFatalErrorOnJS: typeof reportFatalErrorOnJS
) {
  'worklet';
  globalThis.__ErrorUtils = {
    reportFatalError: (error: Error) => {
      runOnJS(boundReportFatalErrorOnJS)({
        message: error.message,
        moduleName: 'Worklets',
        stack: error.stack,
      });
    },
  };
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
    /* eslint-disable @typescript-eslint/unbound-method */
    assert: runOnJS(boundCapturableConsole.assert),
    debug: runOnJS(boundCapturableConsole.debug),
    log: runOnJS(boundCapturableConsole.log),
    warn: runOnJS(boundCapturableConsole.warn),
    error: runOnJS(boundCapturableConsole.error),
    info: runOnJS(boundCapturableConsole.info),
    /* eslint-enable @typescript-eslint/unbound-method */
  };
}

export function initializeUIRuntime(WorkletsModule: IWorkletsModule) {
  if (IS_WEB || globalThis._WORKLET) {
    return;
  }
  if (!WorkletsModule) {
    throw new WorkletsError(
      'Worklets are trying to initialize the UI runtime without a valid WorkletsModule'
    );
  }
  if (IS_JEST) {
    // requestAnimationFrame react-native jest's setup is incorrect as it polyfills
    // the method directly using setTimeout, therefore the callback doesn't get the
    // expected timestamp as the only argument: https://github.com/facebook/react-native/blob/main/packages/react-native/jest/setup.js#L28
    // We override this setup here to make sure that callbacks get the proper timestamps
    // when executed. For non-jest environments we define requestAnimationFrame in setupRequestAnimationFrame
    // @ts-ignore TypeScript uses Node definition for rAF, setTimeout, etc which returns a Timeout object rather than a number
    globalThis.requestAnimationFrame = mockedRequestAnimationFrame;
  }

  const runtimeBoundReportFatalErrorOnJS = reportFatalErrorOnJS;
  const runtimeBoundCapturableConsole = getMemorySafeCapturableConsole();

  if (!SHOULD_BE_USE_WEB) {
    executeOnUIRuntimeSync(() => {
      'worklet';
      setupErrorUtils(runtimeBoundReportFatalErrorOnJS);
      setupCallGuard();
      setupConsole(runtimeBoundCapturableConsole);
      setupMicrotasks();
      setupRequestAnimationFrame();
    })();
  }
}
