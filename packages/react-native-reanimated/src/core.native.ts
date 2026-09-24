'use strict';
import { controlEdgeToEdgeValues } from 'react-native-is-edge-to-edge';
import type { WorkletFunction } from 'react-native-worklets';
import { createSerializable } from 'react-native-worklets';

import type {
  AnimatedKeyboardOptions,
  SensorConfig,
  SensorType,
  Value3D,
  ValueRotation,
} from './commonTypes';
import {
  createEventHandlerWorklet,
  createKeyboardEventHandlerWorklet,
  EDGE_TO_EDGE,
  getSensorContainer,
} from './coreCommon';
import { ReanimatedModule } from './ReanimatedModule';

export {
  configureLayoutAnimationBatch,
  enableLayoutAnimations,
  getViewProp,
  initializeSensor,
  isConfigured,
  isReanimated3,
  makeMutable,
  setShouldAnimateExitingForTag,
  startMapper,
  stopMapper,
  unregisterEventHandler,
  unregisterSensor,
  unsubscribeFromKeyboardEvents,
} from './coreCommon';

export function registerEventHandler<TEvent>(
  eventHandler: (event: TEvent) => void,
  eventName: string,
  emitterReactTag = -1
): number {
  return ReanimatedModule.registerEventHandler(
    createSerializable(
      createEventHandlerWorklet(eventHandler) as WorkletFunction
    ),
    eventName,
    emitterReactTag
  );
}

export function subscribeForKeyboardEvents(
  eventHandler: (state: number, height: number) => void,
  options: AnimatedKeyboardOptions
): number {
  if (__DEV__) {
    controlEdgeToEdgeValues({
      isStatusBarTranslucentAndroid: options.isStatusBarTranslucentAndroid,
      isNavigationBarTranslucentAndroid:
        options.isNavigationBarTranslucentAndroid,
    });
  }

  return ReanimatedModule.subscribeForKeyboardEvents(
    createSerializable(
      createKeyboardEventHandlerWorklet(eventHandler) as WorkletFunction
    ),
    EDGE_TO_EDGE || (options.isStatusBarTranslucentAndroid ?? false),
    EDGE_TO_EDGE || (options.isNavigationBarTranslucentAndroid ?? false)
  );
}

export function registerSensor(
  sensorType: SensorType,
  config: SensorConfig,
  eventHandler: (
    data: Value3D | ValueRotation,
    orientationDegrees: number
  ) => void
): number {
  return getSensorContainer().registerSensor(
    sensorType,
    config,
    createSerializable(eventHandler as WorkletFunction)
  );
}
