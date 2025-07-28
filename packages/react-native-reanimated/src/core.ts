'use strict';
import {
  controlEdgeToEdgeValues,
  isEdgeToEdge,
} from 'react-native-is-edge-to-edge';
import type { WorkletFunction } from 'react-native-worklets';

import { logger, ReanimatedError } from './common';
import type {
  AnimatedKeyboardOptions,
  LayoutAnimationBatchItem,
  SensorConfig,
  SensorType,
  SharedValue,
  Value3D,
  ValueRotation,
} from './commonTypes';
import { ReanimatedModule } from './ReanimatedModule';
import { SensorContainer } from './SensorContainer';
import { makeShareableCloneRecursive } from './workletFunctions';

export { startMapper, stopMapper } from './mappers';
export { makeMutable } from './mutables';

const EDGE_TO_EDGE = isEdgeToEdge();

/**
 * @deprecated Please use the exported variable `reanimatedVersion` instead.
 * @returns `true` in Reanimated 3, doesn't exist in Reanimated 2 or 1
 */
export const isReanimated3 = () => {
  logger.warn(
    'The `isReanimated3` function is deprecated. Please use the exported variable `reanimatedVersion` instead.'
  );
  return false;
};

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
  if (!component) {
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
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
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
    // TODO: Fix this and don't call `__flushAnimationFrame` here.
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
    // TODO: Fix this and don't call `__flushAnimationFrame` here.
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

/**
 * @deprecated This function no longer has any effect in Reanimated and will be
 *   removed in the future.
 */
export function enableLayoutAnimations(
  _flag: boolean,
  _isCallByUser = true
): void {
  logger.warn(
    '`enableLayoutAnimations` is deprecated and will be removed in the future.'
  );
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
