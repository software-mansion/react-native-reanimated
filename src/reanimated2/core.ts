import NativeReanimatedModule from './NativeReanimated';
import { nativeShouldBeMock, shouldBeUseWeb, isWeb } from './PlatformChecker';
import { BasicWorkletFunction, Value3D, ValueRotation } from './commonTypes';
import {
  makeShareableCloneRecursive,
  makeShareable as makeShareableUnwrapped,
} from './shareables';
import { startMapper as startMapperUnwrapped } from './mappers';
import {
  makeMutable as makeMutableUnwrapped,
  makeRemote as makeRemoteUnwrapped,
} from './mutables';
import { LayoutAnimationFunction } from './layoutReanimation';
import { initializeUIRuntime } from './initializers';

export { stopMapper } from './mappers';
export { runOnJS, runOnUI } from './threads';
export { getTimestamp } from './time';

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

// initialize UI runtime if applicable
if (!isWeb() && isConfigured()) {
  initializeUIRuntime();
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
