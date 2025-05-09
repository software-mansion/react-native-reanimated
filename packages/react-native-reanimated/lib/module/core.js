'use strict';

import { controlEdgeToEdgeValues, isEdgeToEdge } from 'react-native-is-edge-to-edge';
import { makeShareableCloneRecursive } from 'react-native-worklets';
import { ReanimatedError } from "./errors.js";
import { shouldBeUseWeb } from "./PlatformChecker.js";
import { ReanimatedModule } from './ReanimatedModule';
import { SensorContainer } from "./SensorContainer.js";
export { startMapper, stopMapper } from "./mappers.js";
export { makeMutable } from "./mutables.js";
export { createWorkletRuntime, executeOnUIRuntimeSync, makeShareable, makeShareableCloneRecursive, runOnJS, runOnRuntime, runOnUI } from 'react-native-worklets';
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
export function getViewProp(viewTag, propName, component) {
  if (!component) {
    throw new ReanimatedError('Function `getViewProp` requires a component to be passed as an argument on Fabric.');
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return new Promise((resolve, reject) => {
    return ReanimatedModule.getViewProp(viewTag, propName, component, result => {
      if (typeof result === 'string' && result.substr(0, 6) === 'error:') {
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

    global.__frameTimestamp = eventTimestamp;
    eventHandler(event);
    global.__flushAnimationFrame(eventTimestamp);
    global.__frameTimestamp = undefined;
  }
  return ReanimatedModule.registerEventHandler(makeShareableCloneRecursive(handleAndFlushAnimationFrame), eventName, emitterReactTag);
}
export function unregisterEventHandler(id) {
  return ReanimatedModule.unregisterEventHandler(id);
}
export function subscribeForKeyboardEvents(eventHandler, options) {
  // TODO: this should really go with the same code path as other events, that is
  // via registerEventHandler. For now we are copying the code from there.
  function handleAndFlushAnimationFrame(state, height) {
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
      isNavigationBarTranslucentAndroid: options.isNavigationBarTranslucentAndroid
    });
  }
  return ReanimatedModule.subscribeForKeyboardEvents(makeShareableCloneRecursive(handleAndFlushAnimationFrame), EDGE_TO_EDGE || (options.isStatusBarTranslucentAndroid ?? false), EDGE_TO_EDGE || (options.isNavigationBarTranslucentAndroid ?? false));
}
export function unsubscribeFromKeyboardEvents(listenerId) {
  return ReanimatedModule.unsubscribeFromKeyboardEvents(listenerId);
}
export function registerSensor(sensorType, config, eventHandler) {
  const sensorContainer = getSensorContainer();
  return sensorContainer.registerSensor(sensorType, config, makeShareableCloneRecursive(eventHandler));
}
export function initializeSensor(sensorType, config) {
  const sensorContainer = getSensorContainer();
  return sensorContainer.initializeSensor(sensorType, config);
}
export function unregisterSensor(sensorId) {
  const sensorContainer = getSensorContainer();
  return sensorContainer.unregisterSensor(sensorId);
}
let featuresConfig = {
  enableLayoutAnimations: false,
  setByUser: false
};
export function enableLayoutAnimations(flag, isCallByUser = true) {
  if (isCallByUser) {
    featuresConfig = {
      enableLayoutAnimations: flag,
      setByUser: true
    };
    ReanimatedModule.enableLayoutAnimations(flag);
  } else if (!featuresConfig.setByUser && featuresConfig.enableLayoutAnimations !== flag) {
    featuresConfig.enableLayoutAnimations = flag;
    ReanimatedModule.enableLayoutAnimations(flag);
  }
}
export function configureLayoutAnimationBatch(layoutAnimationsBatch) {
  ReanimatedModule.configureLayoutAnimationBatch(layoutAnimationsBatch);
}
export function setShouldAnimateExitingForTag(viewTag, shouldAnimate) {
  ReanimatedModule.setShouldAnimateExitingForTag(viewTag, shouldAnimate);
}
export function jsiConfigureProps(uiProps, nativeProps) {
  if (!SHOULD_BE_USE_WEB) {
    ReanimatedModule.configureProps(uiProps, nativeProps);
  }
}
//# sourceMappingURL=core.js.map