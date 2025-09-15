'use strict';

import { controlEdgeToEdgeValues, isEdgeToEdge } from 'react-native-is-edge-to-edge';
import { createSerializable } from 'react-native-worklets';
import { logger, ReanimatedError } from './common';
import { ReanimatedModule } from './ReanimatedModule';
import { SensorContainer } from './SensorContainer';
export { startMapper, stopMapper } from './mappers';
export { makeMutable } from './mutables';
const EDGE_TO_EDGE = isEdgeToEdge();

/**
 * @deprecated Please use the exported variable `reanimatedVersion` instead.
 * @returns `false` in Reanimated 4, `true` in Reanimated 3, doesn't exist in
 *   Reanimated 2 or 1
 */
export const isReanimated3 = () => {
  logger.warn('The `isReanimated3` function is deprecated. Please use the exported variable `reanimatedVersion` instead.');
  return false;
};

// Superseded by check in `/src/threads.ts`.
// Used by `react-navigation` to detect if using Reanimated 2 or 3.
/**
 * @deprecated Please use the exported variable `reanimatedVersion` instead.
 * @returns `false` in Reanimated 4, `true` in Reanimated 3, doesn't exist in
 *   Reanimated 2 or 1
 */
export const isConfigured = isReanimated3;
export function getViewProp(viewTag, propName, component) {
  if (!component) {
    throw new ReanimatedError('Function `getViewProp` requires a component to be passed as an argument on Fabric.');
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return new Promise((resolve, reject) => {
    return ReanimatedModule.getViewProp(viewTag, propName, component, result => {
      if (typeof result === 'string' && result.slice(0, 6) === 'error:') {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}
function getSensorContainer() {
  if (!global.__sensorContainer) {
    global.__sensorContainer = new SensorContainer();
  }
  return global.__sensorContainer;
}
export function registerEventHandler(eventHandler, eventName, emitterReactTag = -1) {
  function handleAndFlushAnimationFrame(eventTimestamp, event) {
    'worklet';

    // TODO: Fix this and don't call `__flushAnimationFrame` here.
    global.__frameTimestamp = eventTimestamp;
    eventHandler(event);
    global.__flushAnimationFrame(eventTimestamp);
    global.__frameTimestamp = undefined;
  }
  return ReanimatedModule.registerEventHandler(createSerializable(handleAndFlushAnimationFrame), eventName, emitterReactTag);
}
export function unregisterEventHandler(id) {
  return ReanimatedModule.unregisterEventHandler(id);
}
export function subscribeForKeyboardEvents(eventHandler, options) {
  // TODO: this should really go with the same code path as other events, that is
  // via registerEventHandler. For now we are copying the code from there.
  function handleAndFlushAnimationFrame(state, height) {
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
      isNavigationBarTranslucentAndroid: options.isNavigationBarTranslucentAndroid
    });
  }
  return ReanimatedModule.subscribeForKeyboardEvents(createSerializable(handleAndFlushAnimationFrame), EDGE_TO_EDGE || (options.isStatusBarTranslucentAndroid ?? false), EDGE_TO_EDGE || (options.isNavigationBarTranslucentAndroid ?? false));
}
export function unsubscribeFromKeyboardEvents(listenerId) {
  return ReanimatedModule.unsubscribeFromKeyboardEvents(listenerId);
}
export function registerSensor(sensorType, config, eventHandler) {
  const sensorContainer = getSensorContainer();
  return sensorContainer.registerSensor(sensorType, config, createSerializable(eventHandler));
}
export function initializeSensor(sensorType, config) {
  const sensorContainer = getSensorContainer();
  return sensorContainer.initializeSensor(sensorType, config);
}
export function unregisterSensor(sensorId) {
  const sensorContainer = getSensorContainer();
  return sensorContainer.unregisterSensor(sensorId);
}

/**
 * @deprecated This function no longer has any effect in Reanimated and will be
 *   removed in the future.
 */
export function enableLayoutAnimations(_flag, _isCallByUser = true) {
  logger.warn('`enableLayoutAnimations` is deprecated and will be removed in the future.');
}
export function configureLayoutAnimationBatch(layoutAnimationsBatch) {
  ReanimatedModule.configureLayoutAnimationBatch(layoutAnimationsBatch);
}
export function setShouldAnimateExitingForTag(viewTag, shouldAnimate) {
  ReanimatedModule.setShouldAnimateExitingForTag(viewTag, shouldAnimate);
}
//# sourceMappingURL=core.js.map