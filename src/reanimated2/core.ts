/* global _setGlobalConsole */
import NativeReanimatedModule from './NativeReanimated';
import { nativeShouldBeMock, shouldBeUseWeb, isWeb } from './PlatformChecker';
import { BasicWorkletFunction, Value3D, ValueRotation } from './commonTypes';
import {
  makeShareableCloneRecursive,
  makeShareable as makeShareableUnwrapped,
} from './shareables';
import { runOnUI, runOnJS } from './threads';
import { startMapper as startMapperUnwrapped } from './mappers';
import {
  makeMutable as makeMutableUnwrapped,
  makeRemote as makeRemoteUnwrapped,
} from './mutables';
import { LayoutAnimationFunction } from './layoutReanimation';

export { stopMapper } from './mappers';
export { runOnJS, runOnUI } from './threads';
export { getTimestamp } from './time';

if (global._setGlobalConsole === undefined) {
  // it can happen when Reanimated plugin wasn't added, but the user uses the only API from version 1
  global._setGlobalConsole = () => {
    // noop
  };
}

export type ReanimatedConsole = Pick<
  Console,
  'debug' | 'log' | 'warn' | 'info' | 'error'
>;

const testWorklet: BasicWorkletFunction<void> = () => {
  'worklet';
};

const throwUninitializedReanimatedException = () => {
  throw new Error(
    "Failed to initialize react-native-reanimated library, make sure you followed installation steps here: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation/ \n1) Make sure reanimated's babel plugin is installed in your babel.config.js (you should have 'react-native-reanimated/plugin' listed there - also see the above link for details) \n2) Make sure you reset build cache after updating the config, run: yarn start --reset-cache"
  );
};

export const checkPluginState: (throwError: boolean) => boolean = (
  throwError = true
) => {
  if (!testWorklet.__workletHash && !shouldBeUseWeb()) {
    if (throwError) {
      throwUninitializedReanimatedException();
    }
    return false;
  }
  return true;
};

export const isConfigured: (throwError?: boolean) => boolean = (
  throwError = false
) => {
  return checkPluginState(throwError);
};

export const isConfiguredCheck: () => void = () => {
  checkPluginState(true);
};

const configurationCheckWrapper = __DEV__
  ? <T extends Array<any>, U>(fn: (...args: T) => U) => {
      return (...args: T): U => {
        isConfigured(true);
        return fn(...args);
      };
    }
  : <T extends Array<any>, U>(fn: (...args: T) => U) => fn;

export const startMapper = __DEV__
  ? configurationCheckWrapper(startMapperUnwrapped)
  : startMapperUnwrapped;

export const makeShareable = __DEV__
  ? configurationCheckWrapper(makeShareableUnwrapped)
  : makeShareableUnwrapped;

export const makeMutable = __DEV__
  ? configurationCheckWrapper(makeMutableUnwrapped)
  : makeMutableUnwrapped;

export const makeRemote = __DEV__
  ? configurationCheckWrapper(makeRemoteUnwrapped)
  : makeRemoteUnwrapped;

global._WORKLET = false;
global._log = function (s: string) {
  console.log(s);
};

export function getViewProp<T>(viewTag: string, propName: string): Promise<T> {
  if (global._IS_FABRIC) {
    throw new Error(
      '[react-native-reanimated] `getViewProp` is not supported on Fabric yet'
    );
  }

  return new Promise((resolve, reject) => {
    return NativeReanimatedModule.getViewProp(
      viewTag,
      propName,
      (result: T) => {
        if (typeof result === 'string' && result.substr(0, 6) === 'error:') {
          reject(result);
        } else {
          resolve(result);
        }
      }
    );
  });
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
      // eslint-disable-next-line no-eval
      workletFun = eval('(' + objectToUnpack.asString + '\n)') as (
        ...args: any[]
      ) => any;
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

export function registerEventHandler<T>(
  eventHash: string,
  eventHandler: (event: T) => void
): string {
  return NativeReanimatedModule.registerEventHandler(
    eventHash,
    makeShareableCloneRecursive(eventHandler)
  );
}

export function unregisterEventHandler(id: string): void {
  return NativeReanimatedModule.unregisterEventHandler(id);
}

export function subscribeForKeyboardEvents(
  eventHandler: (state: number, height: number) => void
): number {
  return NativeReanimatedModule.subscribeForKeyboardEvents(
    makeShareableCloneRecursive(eventHandler)
  );
}

export function unsubscribeFromKeyboardEvents(listenerId: number): void {
  return NativeReanimatedModule.unsubscribeFromKeyboardEvents(listenerId);
}

export function registerSensor(
  sensorType: number,
  interval: number,
  eventHandler: (data: Value3D | ValueRotation) => void
): number {
  return NativeReanimatedModule.registerSensor(
    sensorType,
    interval,
    makeShareableCloneRecursive(eventHandler)
  );
}

export function unregisterSensor(listenerId: number): void {
  return NativeReanimatedModule.unregisterSensor(listenerId);
}

NativeReanimatedModule.installCoreFunctions(valueUnpacker);

if (!isWeb() && isConfigured()) {
  const capturableConsole = console;
  runOnUI(() => {
    'worklet';
    const console = {
      debug: runOnJS(capturableConsole.debug),
      log: runOnJS(capturableConsole.log),
      warn: runOnJS(capturableConsole.warn),
      error: runOnJS(capturableConsole.error),
      info: runOnJS(capturableConsole.info),
    };
    _setGlobalConsole(console);
  })();
}

type FeaturesConfig = {
  enableLayoutAnimations: boolean;
  setByUser: boolean;
};

let featuresConfig: FeaturesConfig = {
  enableLayoutAnimations: false,
  setByUser: false,
};

export function enableLayoutAnimations(
  flag: boolean,
  isCallByUser = true
): void {
  if (isCallByUser) {
    featuresConfig = {
      enableLayoutAnimations: flag,
      setByUser: true,
    };
    NativeReanimatedModule.enableLayoutAnimations(flag);
  } else if (
    !featuresConfig.setByUser &&
    featuresConfig.enableLayoutAnimations !== flag
  ) {
    featuresConfig.enableLayoutAnimations = flag;
    NativeReanimatedModule.enableLayoutAnimations(flag);
  }
}

export function configureLayoutAnimations(
  viewTag: number,
  type: string,
  config: LayoutAnimationFunction | Keyframe
): void {
  NativeReanimatedModule.configureLayoutAnimation(
    viewTag,
    type,
    makeShareableCloneRecursive(config)
  );
}

export function configureProps(uiProps: string[], nativeProps: string[]): void {
  if (!nativeShouldBeMock()) {
    NativeReanimatedModule.configureProps(uiProps, nativeProps);
  }
}
