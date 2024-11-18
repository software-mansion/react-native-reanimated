'use strict';
import { registerReanimatedError, reportFatalErrorOnJS } from './errors';
import { isChromeDebugger, isJest, shouldBeUseWeb } from './PlatformChecker';
import {
  runOnJS,
  setupMicrotasks,
  callMicrotasks,
  runOnUIImmediately,
  executeOnUIRuntimeSync,
} from './threads';
import { mockedRequestAnimationFrame } from './mockedRequestAnimationFrame';
import {
  DEFAULT_LOGGER_CONFIG,
  logToLogBoxAndConsole,
  registerLoggerConfig,
  replaceLoggerImplementation,
} from './logger';

const IS_JEST = isJest();
const SHOULD_BE_USE_WEB = shouldBeUseWeb();
const IS_CHROME_DEBUGGER = isChromeDebugger();

// Override the logFunction implementation with the one that adds logs
// with better stack traces to the LogBox (need to override it after `runOnJS`
// is defined).
function overrideLogFunctionImplementation() {
  'worklet';
  replaceLoggerImplementation((data) => {
    'worklet';
    runOnJS(logToLogBoxAndConsole)(data);
  });
}

// Register logger config and replace the log function implementation in
// the React runtime global scope
registerLoggerConfig(DEFAULT_LOGGER_CONFIG);
overrideLogFunctionImplementation();

// this is for web implementation
if (SHOULD_BE_USE_WEB) {
  global._WORKLET = false;
  global._log = console.log;
  global._getAnimationTimestamp = () => performance.now();
} else {
  // Register ReanimatedError and logger config in the UI runtime global scope.
  // (we are using `executeOnUIRuntimeSync` here to make sure that the changes
  // are applied before any async operations are executed on the UI runtime)
  executeOnUIRuntimeSync(registerReanimatedError)();
  executeOnUIRuntimeSync(registerLoggerConfig)(DEFAULT_LOGGER_CONFIG);
  executeOnUIRuntimeSync(overrideLogFunctionImplementation)();
}

// callGuard is only used with debug builds
export function callGuardDEV<Args extends unknown[], ReturnValue>(
  fn: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue | void {
  'worklet';
  try {
    return fn(...args);
  } catch (e) {
    if (global.__ErrorUtils) {
      global.__ErrorUtils.reportFatalError(e as Error);
    } else {
      throw e;
    }
  }
}

export function setupCallGuard() {
  'worklet';
  global.__callGuardDEV = callGuardDEV;
  global.__ErrorUtils = {
    reportFatalError: (error: Error) => {
      runOnJS(reportFatalErrorOnJS)({
        message: error.message,
        stack: error.stack,
      });
    },
  };
}

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
function createMemorySafeCapturableConsole(): typeof console {
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

  return consoleCopy as unknown as typeof console;
}

// We really have to create a copy of console here. Function runOnJS we use on elements inside
// this object makes it not configurable
const capturableConsole = createMemorySafeCapturableConsole();

export function setupConsole() {
  'worklet';
  if (!IS_CHROME_DEBUGGER) {
    // @ts-ignore TypeScript doesn't like that there are missing methods in console object, but we don't provide all the methods for the UI runtime console version
    global.console = {
      /* eslint-disable @typescript-eslint/unbound-method */
      assert: runOnJS(capturableConsole.assert),
      debug: runOnJS(capturableConsole.debug),
      log: runOnJS(capturableConsole.log),
      warn: runOnJS(capturableConsole.warn),
      error: runOnJS(capturableConsole.error),
      info: runOnJS(capturableConsole.info),
      /* eslint-enable @typescript-eslint/unbound-method */
    };
  }
}

function setupRequestAnimationFrame() {
  'worklet';

  // Jest mocks requestAnimationFrame API and it does not like if that mock gets overridden
  // so we avoid doing requestAnimationFrame batching in Jest environment.
  const nativeRequestAnimationFrame = global.requestAnimationFrame;

  let animationFrameCallbacks: Array<(timestamp: number) => void> = [];
  let flushRequested = false;

  global.__flushAnimationFrame = (frameTimestamp: number) => {
    const currentCallbacks = animationFrameCallbacks;
    animationFrameCallbacks = [];
    currentCallbacks.forEach((f) => f(frameTimestamp));
    callMicrotasks();
  };

  global.requestAnimationFrame = (
    callback: (timestamp: number) => void
  ): number => {
    animationFrameCallbacks.push(callback);
    if (!flushRequested) {
      flushRequested = true;
      nativeRequestAnimationFrame((timestamp) => {
        flushRequested = false;
        global.__frameTimestamp = timestamp;
        global.__flushAnimationFrame(timestamp);
        global.__frameTimestamp = undefined;
      });
    }
    // Reanimated currently does not support cancelling callbacks requested with
    // requestAnimationFrame. We return -1 as identifier which isn't in line
    // with the spec but it should give users better clue in case they actually
    // attempt to store the value returned from rAF and use it for cancelling.
    return -1;
  };
}

export function initializeUIRuntime() {
  if (IS_JEST) {
    // requestAnimationFrame react-native jest's setup is incorrect as it polyfills
    // the method directly using setTimeout, therefore the callback doesn't get the
    // expected timestamp as the only argument: https://github.com/facebook/react-native/blob/main/packages/react-native/jest/setup.js#L28
    // We override this setup here to make sure that callbacks get the proper timestamps
    // when executed. For non-jest environments we define requestAnimationFrame in setupRequestAnimationFrame
    // @ts-ignore TypeScript uses Node definition for rAF, setTimeout, etc which returns a Timeout object rather than a number
    globalThis.requestAnimationFrame = mockedRequestAnimationFrame;
  }

  runOnUIImmediately(() => {
    'worklet';
    setupCallGuard();
    setupConsole();
    if (!SHOULD_BE_USE_WEB) {
      setupMicrotasks();
      setupRequestAnimationFrame();
    }
  })();
}
