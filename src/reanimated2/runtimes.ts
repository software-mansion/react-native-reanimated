import { isChromeDebugger } from './PlatformChecker';
import type { ComplexWorkletFunction } from './commonTypes';
import { reportFatalErrorOnJS } from './errors';
import { valueUnpacker } from './initializers';
import { makeShareableCloneRecursive } from './shareables';
import { runOnJS } from './threads';

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: true;
};

const IS_CHROME_DEBUGGER = isChromeDebugger();

export function createWorkletRuntime(name: string) {
  // @ts-ignore valueUnpacker is a worklet
  const valueUnpackerCode = valueUnpacker.__initData.code;
  const runtime = global._createWorkletRuntime(name, valueUnpackerCode);

  // we need to use different names because `_scheduleOnJS` and `_makeShareableClone` are whitelisted
  const {
    _makeShareableClone: makeShareableClone,
    _scheduleOnJS: scheduleOnJS,
  } = global;

  // TODO: unify with initializers.ts
  const capturableConsole = { ...console };

  runOnRuntimeSync(runtime, () => {
    'worklet';

    global._scheduleOnJS = scheduleOnJS;
    global._makeShareableClone = makeShareableClone;

    // setup error handler
    global.__ErrorUtils = {
      reportFatalError: (error: Error) => {
        runOnJS(reportFatalErrorOnJS)({
          message: error.message,
          stack: error.stack,
        });
      },
    };

    if (!IS_CHROME_DEBUGGER) {
      // setup console
      // @ts-ignore TypeScript doesn't like that there are missing methods in console object, but we don't provide all the methods for the UI runtime console version
      global.console = {
        assert: runOnJS(capturableConsole.assert),
        debug: runOnJS(capturableConsole.debug),
        log: runOnJS(capturableConsole.log),
        warn: runOnJS(capturableConsole.warn),
        error: runOnJS(capturableConsole.error),
        info: runOnJS(capturableConsole.info),
      };
    }

    // TODO: call user-defined initializer worklet
  });

  return runtime;
}

function runOnRuntimeSync(
  runtime: WorkletRuntime,
  worklet: ComplexWorkletFunction<[], void>
) {
  global._runOnRuntime(runtime, makeShareableCloneRecursive(worklet));
}
