'use strict';
import { controlEdgeToEdgeValues } from 'react-native-is-edge-to-edge';
import type { SerializableRef, WorkletFunction } from 'react-native-worklets';

import type {
  AnimatedKeyboardOptions,
  SensorConfig,
  SensorType,
  SensorValue,
  SensorValueMap,
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
  isSensorAvailable,
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
    createEventHandlerWorklet(
      eventHandler
    ) as unknown as SerializableRef<WorkletFunction>,
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
    createKeyboardEventHandlerWorklet(
      eventHandler
    ) as unknown as SerializableRef<WorkletFunction>,
    EDGE_TO_EDGE || (options.isStatusBarTranslucentAndroid ?? false),
    EDGE_TO_EDGE || (options.isNavigationBarTranslucentAndroid ?? false)
  );
}

export function registerSensor<T extends SensorType>(
  sensorType: T,
  config: SensorConfig,
  eventHandler: (data: SensorValueMap[T], orientationDegrees: number) => void
): number {
  return getSensorContainer().registerSensor(
    sensorType,
    config,
    eventHandler as unknown as SerializableRef<(data: SensorValue) => void>
  );
}
