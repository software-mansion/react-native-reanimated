'use strict';
import NativeReanimatedModule from './NativeReanimated';
import { isWeb, shouldBeUseWeb, isFabric } from './PlatformChecker';
import type {
  AnimatedKeyboardOptions,
  SensorConfig,
  SensorType,
  SharedValue,
  Value3D,
  ValueRotation,
} from './commonTypes';
import { makeShareableCloneRecursive } from './shareables';
import { initializeUIRuntime } from './initializers';
import type { LayoutAnimationBatchItem } from './layoutReanimation/animationBuilder/commonTypes';
import { SensorContainer } from './SensorContainer';
import { ReanimatedError } from './errors';

export { startMapper, stopMapper } from './mappers';
export { runOnJS, runOnUI, executeOnUIRuntimeSync } from './threads';
export { createWorkletRuntime, runOnRuntime } from './runtimes';
export type { WorkletRuntime } from './runtimes';
export { makeShareable, makeShareableCloneRecursive } from './shareables';
export { makeMutable } from './mutables';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

/** @returns `true` in Reanimated 3, doesn't exist in Reanimated 2 or 1 */
export const isReanimated3 = () => true;

// Superseded by check in `/src/threads.ts`.
// Used by `react-navigation` to detect if using Reanimated 2 or 3.
/**
 * @deprecated This function was superseded by other checks. We keep it here for
 *   backward compatibility reasons. If you need to check if you are using
 *   Reanimated 3 or Reanimated 2 please use `isReanimated3` function instead.
 * @returns `true` in Reanimated 3, doesn't exist in Reanimated 2
 */
export const isConfigured = isReanimated3;

export function getViewProp<T>(
  viewTag: number,
  propName: string,
  component?: React.Component // required on Fabric
): Promise<T> {
  if (isFabric() && !component) {
    throw new ReanimatedError(
      'Function `getViewProp` requires a component to be passed as an argument on Fabric.'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return new Promise((resolve, reject) => {
    return NativeReanimatedModule.getViewProp(
      viewTag,
      propName,
      component,
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

function getSensorContainer(): SensorContainer {
  if (!global.__sensorContainer) {
    global.__sensorContainer = new SensorContainer();
  }
  return global.__sensorContainer;
}

export function registerEventHandler<T>(
  eventHandler: (event: T) => void,
  eventName: string,
  emitterReactTag = -1
): number {
  function handleAndFlushAnimationFrame(eventTimestamp: number, event: T) {
    'worklet';
    global.__frameTimestamp = eventTimestamp;
    eventHandler(event);
    global.__flushAnimationFrame(eventTimestamp);
    global.__frameTimestamp = undefined;
  }
  return NativeReanimatedModule.registerEventHandler(
    makeShareableCloneRecursive(handleAndFlushAnimationFrame),
    eventName,
    emitterReactTag
  );
}

export function unregisterEventHandler(id: number): void {
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
    const now = global._getAnimationTimestamp();
    global.__frameTimestamp = now;
    eventHandler(state, height);
    global.__flushAnimationFrame(now);
    global.__frameTimestamp = undefined;
  }
  return NativeReanimatedModule.subscribeForKeyboardEvents(
    makeShareableCloneRecursive(handleAndFlushAnimationFrame),
    options.isStatusBarTranslucentAndroid ?? false,
    options.isNavigationBarTranslucentAndroid ?? false
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

if (!isWeb()) {
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

export function configureLayoutAnimationBatch(
  layoutAnimationsBatch: LayoutAnimationBatchItem[]
): void {
  NativeReanimatedModule.configureLayoutAnimationBatch(layoutAnimationsBatch);
}

export function setShouldAnimateExitingForTag(
  viewTag: number | HTMLElement,
  shouldAnimate: boolean
) {
  NativeReanimatedModule.setShouldAnimateExitingForTag(
    viewTag as number,
    shouldAnimate
  );
}

export function jsiConfigureProps(
  uiProps: string[],
  nativeProps: string[]
): void {
  if (!SHOULD_BE_USE_WEB) {
    NativeReanimatedModule.configureProps(uiProps, nativeProps);
  }
}
