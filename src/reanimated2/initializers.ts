import { reportFatalErrorOnJS } from './errors';
import NativeReanimatedModule from './NativeReanimated';
import { isJest } from './PlatformChecker';
import { runOnUI, runOnJS } from './threads';

// callGuard is only used with debug builds
function callGuardDEV<T extends Array<any>, U>(
  fn: (...args: T) => U,
  ...args: T
): void {
  'worklet';
  try {
    fn(...args);
  } catch (e) {
    if (global.ErrorUtils) {
      global.ErrorUtils.reportFatalError(e as Error);
    } else {
      throw e;
    }
  }
}

function valueUnpacker(objectToUnpack: any, category?: string): any {
  'worklet';
  let workletsCache = global.__workletsCache;
  let handleCache = global.__handleCache;
  if (workletsCache === undefined) {
    // init
    workletsCache = global.__workletsCache = new Map();
    handleCache = global.__handleCache = new WeakMap();
  }
  if (objectToUnpack.__workletHash) {
    let workletFun = workletsCache.get(objectToUnpack.__workletHash);
    if (workletFun === undefined) {
      if (global.evalWithSourceMap) {
        // if the runtime (hermes only for now) supports loading source maps
        // we want to use the proper filename for the location as it guarantees
        // that debugger understands and loads the source code of the file where
        // the worklet is defined.
        workletFun = global.evalWithSourceMap(
          '(' + objectToUnpack.asString + '\n)',
          objectToUnpack.__location,
          objectToUnpack.__sourceMap
        ) as (...args: any[]) => any;
      } else if (global.evalWithSourceUrl) {
        // if the runtime doesn't support loading source maps, in dev mode we
        // can pass source url when evaluating the worklet. Now, instead of using
        // the actual file location we use worklet hash, as it the allows us to
        // properly symbolicate traces (see errors.ts for details)
        workletFun = global.evalWithSourceUrl(
          '(' + objectToUnpack.asString + '\n)',
          `worklet_${objectToUnpack.__workletHash}`
        ) as (...args: any[]) => any;
      } else {
        // in release we use the regular eval to save on JSI calls
        // eslint-disable-next-line no-eval
        workletFun = eval('(' + objectToUnpack.asString + '\n)') as (
          ...args: any[]
        ) => any;
      }
      workletsCache.set(objectToUnpack.__workletHash, workletFun);
    }
    const functionInstance = workletFun.bind(objectToUnpack);
    objectToUnpack._recur = functionInstance;
    return functionInstance;
  } else if (objectToUnpack.__init) {
    let value = handleCache!.get(objectToUnpack);
    if (value === undefined) {
      value = objectToUnpack.__init();
      handleCache!.set(objectToUnpack, value);
    }
    return value;
  } else if (category === 'RemoteFunction') {
    const fun = () => {
      throw new Error(`Tried to synchronously call a non-worklet function on the UI thread.

Possible solutions are:
  a) If you want to synchronously execute this method, mark it as a worklet
  b) If you want to execute this function on the JS thread, wrap it using \`runOnJS\``);
    };
    fun.__remoteFunction = objectToUnpack;
    return fun;
  } else {
    throw new Error('data type not recognized by unpack method');
  }
}

export function initializeUIRuntime() {
  NativeReanimatedModule.installCoreFunctions(callGuardDEV, valueUnpacker);

  const IS_JEST = isJest();

  const capturableConsole = console;
  runOnUI(() => {
    'worklet';
    // setup error handler
    global.ErrorUtils = {
      reportFatalError: (error: Error) => {
        runOnJS(reportFatalErrorOnJS)({
          message: error.message,
          stack: error.stack,
        });
      },
    };

    // setup console
    // @ts-ignore TypeScript doesn't like that there are missing methods in console object, but we don't provide all the methods for the UI runtime console version
    global.console = {
      debug: runOnJS(capturableConsole.debug),
      log: runOnJS(capturableConsole.log),
      warn: runOnJS(capturableConsole.warn),
      error: runOnJS(capturableConsole.error),
      info: runOnJS(capturableConsole.info),
    };

    if (!IS_JEST) {
      // Jest mocks requestAnimationFrame API and it does not like if that mock gets overridden
      // so we avoid doing requestAnimationFrame batching in Jest environment.
      const nativeRequestAnimationFrame = global.requestAnimationFrame;
      let callbacks: Array<(time: number) => void> = [];
      global.requestAnimationFrame = (
        callback: (timestamp: number) => void
      ): number => {
        callbacks.push(callback);
        if (callbacks.length === 1) {
          // We schedule native requestAnimationFrame only when the first callback
          // is added and then use it to execute all the enqueued callbacks. Once
          // the callbacks are run, we clear the array.
          nativeRequestAnimationFrame((timestamp) => {
            const currentCallbacks = callbacks;
            callbacks = [];
            currentCallbacks.forEach((f) => f(timestamp));
          });
        }
        // Reanimated currently does not support cancelling calbacks requested with
        // requestAnimationFrame. We return -1 as identifier which isn't in line
        // with the spec but it should give users better clue in case they actually
        // attempt to store the value returned from rAF and use it for cancelling.
        return -1;
      };
    }
  })();
}
