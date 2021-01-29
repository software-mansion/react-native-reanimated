/* global _WORKLET _updateProps _frameTimestamp _eventTimestamp _getCurrentTime */
/**
 * this file contains mutual code for both: ios and android
 */

import { TurboModuleRegistry } from 'react-native';
import RNRenderer from 'react-native/Libraries/Renderer/shims/ReactNative';

/** NativeReanimated.js */
const InnerNativeModule =
  global.__reanimatedModuleProxy ||
  TurboModuleRegistry.getEnforcing('NativeReanimated');

export const NativeReanimated = {
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

/** core.js */
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

export function getTimestamp() {
  'worklet';
  return _getTimestamp();
}

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

/** createAnimatedComponent.js */
export const getViewData = (component) => {
  // hostInstance can be null for a component that doesn't render anything (render function returns null). Example: svg Stop: https://github.com/react-native-svg/react-native-svg/blob/develop/src/elements/Stop.tsx
  const hostInstance = RNRenderer.findHostInstance_DEPRECATED(component);
  if (!hostInstance) {
    throw new Error(
      'Cannot find host instance for this component. Maybe it renders nothing?'
    );
  }
  // we can access view tag in the same way it's accessed here https://github.com/facebook/react/blob/e3f4eb7272d4ca0ee49f27577156b57eeb07cf73/packages/react-native-renderer/src/ReactFabric.js#L146
  const viewTag = hostInstance?._nativeTag;
  /**
   * RN uses viewConfig for components for storing different properties of the component(example: https://github.com/facebook/react-native/blob/master/Libraries/Components/ScrollView/ScrollViewViewConfig.js#L16).
   * The name we're looking for is in the field named uiViewClassName.
   */
  const viewName = hostInstance?.viewConfig?.uiViewClassName;
  const viewConfig = hostInstance?.viewConfig;

  return { viewTag, viewName, viewConfig };
};

/** Colors.js */
export const rgbaColorForJS = (r, g, b, alpha) => {
  'worklet';
  return _WORKLET ? null : `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** UpdateProps.js */
export const updatePropsProcessColors = (
  updates,
  colorProperties,
  processColor
) => {
  'worklet';
  Object.keys(updates).forEach((key) => {
    if (colorProperties.indexOf(key) !== -1) {
      updates[key] = processColor(updates[key]);
    }
  });
};

export const getUpdateProps = () => {
  'worklet';
  return _updateProps;
};

/** Hooks.js */
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

export const getMaybeViewRef = (viewRef) => {
  'worklet';
  return null;
};

/** animations.js */
export const defineAnimationResult = (create) => {
  'worklet';
  return _WORKLET ? create() : create;
};
