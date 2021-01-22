/* global _WORKLET _updateProps _frameTimestamp _eventTimestamp _getCurrentTime */
/**
 * this file contains mutual code for both: ios and android
 */

import { TurboModuleRegistry } from 'react-native';

global.__reanimatedWorkletInit = function(worklet) {
  worklet.__worklet = true;
};

function _getTimestamp() {
  'worklet';
  if (_frameTimestamp) {
    return _frameTimestamp;
  }
  if (_eventTimestamp) {
    return _eventTimestamp;
  }
  return _getCurrentTime();
}

export {
  default as RNRenderer,
} from 'react-native/Libraries/Renderer/shims/ReactNative';

const InnerNativeModule =
  global.__reanimatedModuleProxy ||
  TurboModuleRegistry.getEnforcing('NativeReanimated');

const NativeReanimated = {
  native: true,

  installCoreFunctions(valueSetter) {
    return InnerNativeModule.installCoreFunctions(valueSetter);
  },

  makeShareable(value) {
    return InnerNativeModule.makeShareable(value);
  },

  makeMutable(value) {
    return InnerNativeModule.makeMutable(value);
  },

  makeRemote(object) {
    return InnerNativeModule.makeRemote(object);
  },

  startMapper(mapper, inputs = [], outputs = []) {
    return InnerNativeModule.startMapper(mapper, inputs, outputs);
  },

  stopMapper(mapperId) {
    return InnerNativeModule.stopMapper(mapperId);
  },

  registerEventHandler(eventHash, eventHandler) {
    return InnerNativeModule.registerEventHandler(eventHash, eventHandler);
  },

  unregisterEventHandler(registrationId) {
    return InnerNativeModule.unregisterEventHandler(registrationId);
  },

  getViewProp(viewTag, propName, callback) {
    return InnerNativeModule.getViewProp(viewTag, propName, callback);
  },
};

export { NativeReanimated };

export const rgbaColorForJS = (r, g, b, alpha) => {
  'worklet';
  return _WORKLET ? null : `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function getTimestamp() {
  'worklet';
  return _getTimestamp();
}

export const updatePropsProcessColors = (updates, colorProperties, processColor) => {
  'worklet';
  Object.keys(updates).forEach((key) => {
    if (colorProperties.indexOf(key) !== -1) {
      updates[key] = processColor(updates[key]);
    }
  });
};

export const processEventInHandler = (event) => {
  'worklet';
  return event;
};

export const getEventHandlerResult = (
  useEvent,
  handler,
  dependenciesDiffer
) => {
  'worklet';
  return useEvent(
    handler,
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent'],
    dependenciesDiffer
  );
};

export const defineAnimationResult = (create) => {
  'worklet';
  return _WORKLET ? create() : create;
};

export const requestFrame = (frame) => {
  'worklet';
  requestAnimationFrame(frame);
};

export const installCoreFunctions = (
  workletValueSetter,
  workletValueSetterJS
) => {
  'worklet';
  NativeReanimated.installCoreFunctions(workletValueSetter);
};

export const getMaybeViewRef = (viewRef) => {
  'worklet';
  return null;
};

export const getUpdateProps = () => {
  'worklet';
  return _updateProps;;
};
