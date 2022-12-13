import NativeReanimatedModule from './NativeReanimated';
import { runOnUI, runOnJS } from './threads';

function callGuard<T extends Array<any>, U>(
  fn: (...args: T) => U,
  ...args: T
): void {
  'worklet';
  try {
    fn(...args);
  } catch (e) {
    if (global.ErrorUtils) {
      global.ErrorUtils.reportFatalError(e);
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
      const evalFn =
        global.evalWithSourceMap || global.evalWithSourceUrl || eval; // eslint-disable-line no-eval
      workletFun = evalFn(
        '(' + objectToUnpack.asString + '\n)',
        `worklet_${objectToUnpack.__workletHash}`,
        objectToUnpack.__sourceMap
      ) as (...args: any[]) => any;
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

type StackDetails = [Error, number, number];

const _workletStackDetails = new Map<number, StackDetails>();

export function registerWorkletStackDetails(
  hash: number,
  stackDetails: StackDetails
) {
  _workletStackDetails.set(hash, stackDetails);
}

function getBundleOffset(error: Error): [string, number, number] {
  const frame = error.stack?.split('\n')?.[0];
  if (frame) {
    const parsedFrame = /@(.*):(\d+):(\d+)/.exec(frame);
    if (parsedFrame) {
      const [, file, line, col] = parsedFrame;
      return [file, Number(line), Number(col)];
    }
  }
  return ['unknown', 0, 0];
}

function processStack(stack: string): string {
  const workletStackEntries = stack.match(/worklet_(\d+):(\d+):(\d+)/g);
  let result = stack;
  workletStackEntries?.forEach((match) => {
    const [, hash, origLine, origCol] = match.split(/:|_/).map(Number);
    const errorDetails = _workletStackDetails.get(hash);
    if (!errorDetails) {
      return;
    }
    const [error, lineOffset, colOffset] = errorDetails;
    const [bundleFile, bundleLine, bundleCol] = getBundleOffset(error);
    const line = origLine + bundleLine + lineOffset;
    const col = origCol + bundleCol + colOffset;

    result = result.replace(match, `${bundleFile}:${line}:${col}`);
  });
  return result;
}

function reportFatalErrorOnJS({
  message,
  stack,
}: {
  message: string;
  stack?: string;
}) {
  const error = new Error();
  error.message = message;
  error.stack = stack ? processStack(stack) : undefined;
  error.name = 'ReanimatedError';
  // @ts-ignore React Native's ErrorUtils implementation extends the Error type with jsEngine field
  error.jsEngine = 'reanimated';
  global.ErrorUtils.reportFatalError(error);
}

export function initializeUIRuntime() {
  NativeReanimatedModule.installCoreFunctions(callGuard, valueUnpacker);

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
  })();
}
