'use strict';

import { ReanimatedModule } from '../../../ReanimatedModule';
// COMMON

export function setViewStyle(viewTag, style) {
  ReanimatedModule.setViewStyle(viewTag, style);
}
export function markNodeAsRemovable(shadowNodeWrapper) {
  ReanimatedModule.markNodeAsRemovable(shadowNodeWrapper);
}
export function unmarkNodeAsRemovable(viewTag) {
  ReanimatedModule.unmarkNodeAsRemovable(viewTag);
}

// ANIMATIONS

// Keyframes

export function registerCSSKeyframes(animationName, keyframesConfig) {
  ReanimatedModule.registerCSSKeyframes(animationName, keyframesConfig);
}
export function unregisterCSSKeyframes(animationName) {
  ReanimatedModule.unregisterCSSKeyframes(animationName);
}

// View animations

export function applyCSSAnimations(shadowNodeWrapper, animationUpdates) {
  ReanimatedModule.applyCSSAnimations(shadowNodeWrapper, animationUpdates);
}
export function unregisterCSSAnimations(viewTag) {
  ReanimatedModule.unregisterCSSAnimations(viewTag);
}

// TRANSITIONS

export function registerCSSTransition(shadowNodeWrapper, transitionConfig) {
  ReanimatedModule.registerCSSTransition(shadowNodeWrapper, transitionConfig);
}
export function updateCSSTransition(viewTag, configUpdates) {
  ReanimatedModule.updateCSSTransition(viewTag, configUpdates);
}
export function unregisterCSSTransition(viewTag) {
  ReanimatedModule.unregisterCSSTransition(viewTag);
}
//# sourceMappingURL=native.js.map