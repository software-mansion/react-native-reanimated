/* global _WORKLET _getTimestamp _updateProps */
import { processColor } from '../Colors';
import { TurboModuleRegistry } from 'react-native';
import { makeShareable } from '../core';

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

// copied from react-native/Libraries/Components/View/ReactNativeStyleAttributes
const colorProps = [
  'backgroundColor',
  'borderBottomColor',
  'borderColor',
  'borderLeftColor',
  'borderRightColor',
  'borderTopColor',
  'borderStartColor',
  'borderEndColor',
  'color',
  'shadowColor',
  'textDecorationColor',
  'tintColor',
  'textShadowColor',
  'overlayColor',
];

const ColorProperties = makeShareable(colorProps);

export const updatePropsProcessColors = (updates) => {
  'worklet';
  Object.keys(updates).forEach((key) => {
    if (ColorProperties.indexOf(key) !== -1) {
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
  NativeReanimated.installCoreFunctions(workletValueSetter);
};

export const getMaybeViewRef = (viewRef) => null;

export const getUpdateProps = () => _updateProps;
