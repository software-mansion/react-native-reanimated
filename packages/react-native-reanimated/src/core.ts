'use strict';
import {
  controlEdgeToEdgeValues,
  isEdgeToEdge,
} from 'react-native-is-edge-to-edge';

import type {
  AnimatedKeyboardOptions,
  LayoutAnimationBatchItem,
  SensorConfig,
  SensorType,
  ShadowNodeWrapper,
  SharedValue,
  Value3D,
  ValueRotation,
  WorkletFunction,
} from './commonTypes';
import { ReanimatedError } from './errors';
import { isFabric, shouldBeUseWeb } from './PlatformChecker';
import { ReanimatedModule } from './ReanimatedModule';
import { SensorContainer } from './SensorContainer';
import { makeShareableCloneRecursive } from './shareables';

export { startMapper, stopMapper } from './mappers';
export { makeMutable } from './mutables';
export type { WorkletRuntime } from './runtimes';
export { createWorkletRuntime, runOnRuntime } from './runtimes';
export { makeShareable, makeShareableCloneRecursive } from './shareables';
export { executeOnUIRuntimeSync, runOnJS, runOnUI } from './threads';

const EDGE_TO_EDGE = isEdgeToEdge();
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
    return ReanimatedModule.getViewProp(
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
  return ReanimatedModule.registerEventHandler(
    makeShareableCloneRecursive(
      handleAndFlushAnimationFrame as WorkletFunction
    ),
    eventName,
    emitterReactTag
  );
}

export function unregisterEventHandler(id: number): void {
  return ReanimatedModule.unregisterEventHandler(id);
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

  if (__DEV__) {
    controlEdgeToEdgeValues({
      isStatusBarTranslucentAndroid: options.isStatusBarTranslucentAndroid,
      isNavigationBarTranslucentAndroid:
        options.isNavigationBarTranslucentAndroid,
    });
  }

  return ReanimatedModule.subscribeForKeyboardEvents(
    makeShareableCloneRecursive(
      handleAndFlushAnimationFrame as WorkletFunction
    ),
    EDGE_TO_EDGE || (options.isStatusBarTranslucentAndroid ?? false),
    EDGE_TO_EDGE || (options.isNavigationBarTranslucentAndroid ?? false)
  );
}

export function unsubscribeFromKeyboardEvents(listenerId: number): void {
  return ReanimatedModule.unsubscribeFromKeyboardEvents(listenerId);
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
    makeShareableCloneRecursive(eventHandler as WorkletFunction)
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
    ReanimatedModule.enableLayoutAnimations(flag);
  } else if (
    !featuresConfig.setByUser &&
    featuresConfig.enableLayoutAnimations !== flag
  ) {
    featuresConfig.enableLayoutAnimations = flag;
    ReanimatedModule.enableLayoutAnimations(flag);
  }
}

export function configureLayoutAnimationBatch(
  layoutAnimationsBatch: LayoutAnimationBatchItem[]
): void {
  ReanimatedModule.configureLayoutAnimationBatch(layoutAnimationsBatch);
}

export function setShouldAnimateExitingForTag(
  viewTag: number | HTMLElement,
  shouldAnimate: boolean
) {
  ReanimatedModule.setShouldAnimateExitingForTag(
    viewTag as number,
    shouldAnimate
  );
}

export function jsiConfigureProps(
  uiProps: string[],
  nativeProps: string[]
): void {
  if (!SHOULD_BE_USE_WEB) {
    ReanimatedModule.configureProps(uiProps, nativeProps);
  }
}

export function markNodeAsRemovable(shadowNodeWrapper: ShadowNodeWrapper) {
  ReanimatedModule.markNodeAsRemovable(shadowNodeWrapper);
}

export function unmarkNodeAsRemovable(viewTag: number) {
  ReanimatedModule.unmarkNodeAsRemovable(viewTag);
}
