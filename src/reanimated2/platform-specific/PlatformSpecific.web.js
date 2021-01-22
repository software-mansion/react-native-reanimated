/* global _updatePropsJS */
import reanimatedJS from '../js-reanimated';
export { default as reanimatedJS } from '../js-reanimated';

export const rgbaColorForJS = (r, g, b, alpha) => {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const rgbaColorResult = (c) => c;

export const processColorResult = (normalizedColor) => normalizedColor;

export function getTimestamp() {
  return reanimatedJS.getTimestamp();
}

export const updatePropsProcessColors = (updates, colorProperties, processColor)=> {};

export const processEventInHandler = (event) => event.nativeEvent;

export const getEventHandlerResult = (
  useEvent,
  handler,
  dependenciesDiffer
) => {
  return handler;
};

export const defineAnimationResult = (create) => create();

export const requestFrame = (frame) => {
  reanimatedJS.pushFrame(frame);
};

export const installCoreFunctions = (
  workletValueSetter,
  workletValueSetterJS
) => {
  reanimatedJS.installCoreFunctions(workletValueSetterJS);
};

export const getMaybeViewRef = (viewRef) => viewRef;

export const getUpdateProps = () => _updatePropsJS;

