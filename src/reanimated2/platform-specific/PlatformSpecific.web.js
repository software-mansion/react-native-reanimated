import { findNodeHandle } from 'react-native';
import reanimatedJS, { _updatePropsJS } from '../js-reanimated';
export { default as NativeReanimated } from '../js-reanimated';

/** core.js */
global.__reanimatedWorkletInit = function(worklet) {
  worklet.__worklet = true;
};

export function getTimestamp() {
  return reanimatedJS.getTimestamp();
}

export const requestFrame = (frame) => {
  reanimatedJS.pushFrame(frame);
};

export const installCoreFunctions = (
  workletValueSetter,
  workletValueSetterJS
) => {
  reanimatedJS.installCoreFunctions(workletValueSetterJS);
};

/** Colors.js */
export const rgbaColorForJS = (r, g, b, alpha) => {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const rgbaColorResult = (c) => c;

export const processColorResult = (normalizedColor) => normalizedColor;

/** createAnimatedComponent.js */
export const getViewData = (component) => {
  const viewTag = findNodeHandle(this);

  return { viewTag, viewName: null, viewConfig: null };
};

/** UpdateProps.js */
export const updatePropsProcessColors = (
  updates,
  colorProperties,
  processColor
) => {};

export const getUpdateProps = () => _updatePropsJS;

/** Hooks.js */
export const processEventInHandler = (event) => event.nativeEvent;

export const getEventHandlerResult = (
  useEvent,
  handler,
  dependenciesDiffer
) => {
  return handler;
};

export const getMaybeViewRef = (viewRef) => viewRef;

/** animations.js */
export const defineAnimationResult = (create) => create();
