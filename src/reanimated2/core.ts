import NativeReanimatedModule from './NativeReanimated';
import { nativeShouldBeMock, shouldBeUseWeb, isWeb } from './PlatformChecker';
import {
  AnimatedKeyboardOptions,
  BasicWorkletFunction,
  SensorConfig,
  SensorType,
  SharedValue,
  Value3D,
  ValueRotation,
} from './commonTypes';
import {
  makeShareableCloneRecursive,
  makeShareable as makeShareableUnwrapped,
} from './shareables';
import { startMapper as startMapperUnwrapped } from './mappers';
import {
  makeMutable as makeMutableUnwrapped,
  makeRemote as makeRemoteUnwrapped,
} from './mutables';
import {
  LayoutAnimationFunction,
  LayoutAnimationType,
} from './layoutReanimation';
import { initializeUIRuntime } from './initializers';
import { SensorContainer } from './SensorContainer';

export { stopMapper } from './mappers';
export { runOnJS, runOnUI } from './threads';

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

export function getSensorContainer(): SensorContainer {
  if (!global.__sensorContainer) {
    global.__sensorContainer = new SensorContainer();
  }
  return global.__sensorContainer;
}

export function registerEventHandler<T>(
  eventHash: string,
  eventHandler: (event: T) => void
): string {
  function handleAndFlushAnimationFrame(eventTimestamp: number, event: T) {
    'worklet';
    global.__frameTimestamp = eventTimestamp;
    eventHandler(event);
    global.__flushAnimationFrame(eventTimestamp);
    global.__frameTimestamp = undefined;
  }
  return NativeReanimatedModule.registerEventHandler(
    eventHash,
    makeShareableCloneRecursive(handleAndFlushAnimationFrame)
  );
}

export function unregisterEventHandler(id: string): void {
  return NativeReanimatedModule.unregisterEventHandler(id);
}

export function subscribeForKeyboardEvents(
  eventHandler: (state: number, height: number) => void,
  options: AnimatedKeyboardOptions
): number {
  // TODO: this should really go with the same code path as other events, that is
  // via registerEventHandler. For now we are copying the code from there.
  function handleAndFlushAnimationFrame(state: number, height: number) {
    'worklet';
    const now = performance.now();
    global.__frameTimestamp = now;
    eventHandler(state, height);
    global.__flushAnimationFrame(now);
    global.__frameTimestamp = undefined;
  }
  return NativeReanimatedModule.subscribeForKeyboardEvents(
    makeShareableCloneRecursive(handleAndFlushAnimationFrame),
    options.isStatusBarTranslucentAndroid ?? false
  );
}

export function unsubscribeFromKeyboardEvents(listenerId: number): void {
  return NativeReanimatedModule.unsubscribeFromKeyboardEvents(listenerId);
}

export function registerSensor(
  sensorType: SensorType,
  config: SensorConfig,
  eventHandler: (
    data: Value3D | ValueRotation,
    orientationDegrees: number
  ) => void
): number {
  const sensorContainer = getSensorContainer();
  return sensorContainer.registerSensor(
    sensorType,
    config,
    makeShareableCloneRecursive(eventHandler)
  );
}

export function initializeSensor(
  sensorType: SensorType,
  config: SensorConfig
): SharedValue<Value3D | ValueRotation> {
  const sensorContainer = getSensorContainer();
  return sensorContainer.initializeSensor(sensorType, config);
}

export function unregisterSensor(sensorId: number): void {
  const sensorContainer = getSensorContainer();
  return sensorContainer.unregisterSensor(sensorId);
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
  type: LayoutAnimationType,
  config: LayoutAnimationFunction | Keyframe,
  sharedTransitionTag = ''
): void {
  NativeReanimatedModule.configureLayoutAnimation(
    viewTag,
    type,
    sharedTransitionTag,
    makeShareableCloneRecursive(config)
  );
}

export function configureProps(uiProps: string[], nativeProps: string[]): void {
  if (!nativeShouldBeMock()) {
    NativeReanimatedModule.configureProps(uiProps, nativeProps);
  }
}
