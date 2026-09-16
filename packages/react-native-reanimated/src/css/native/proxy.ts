'use strict';
import { scheduleOnUI } from 'react-native-worklets';

import type { ShadowNodeWrapper, StyleProps } from '../../commonTypes';
import { ReanimatedModule } from '../../ReanimatedModule';
import type { CSSEventHandler } from './events';
import type {
  CSSAnimationUpdates,
  CSSPseudoStyleConfig,
  CSSTransitionConfig,
  NormalizedCSSAnimationKeyframesConfig,
} from './types';

// COMMON

export function setViewStyle(viewTag: number, style: StyleProps) {
  ReanimatedModule.setViewStyle(viewTag, style);
}

// EVENTS

export function setCSSEventHandler(handler: CSSEventHandler) {
  ReanimatedModule.setCSSEventHandler(handler);
}

type ViewLifecycleOperation = {
  shadowNodeWrapper: ShadowNodeWrapper;
  attached: boolean;
};

let pendingViewLifecycleOperations: ViewLifecycleOperation[] = [];

function flushViewLifecycleOperations() {
  const operations = pendingViewLifecycleOperations;
  pendingViewLifecycleOperations = [];
  scheduleOnUI(() => {
    'worklet';
    global._notifyViewsLifecycle?.(operations);
  });
}

// Flushed from a microtask, so the batch is scheduled after every style detachment of the
// same commit and lands on the UI runtime after the last update those styles could emit.
function queueViewLifecycleOperation(operation: ViewLifecycleOperation) {
  if (pendingViewLifecycleOperations.length === 0) {
    queueMicrotask(flushViewLifecycleOperations);
  }
  pendingViewLifecycleOperations.push(operation);
}

export function notifyViewDetached(shadowNodeWrapper: ShadowNodeWrapper) {
  queueViewLifecycleOperation({ shadowNodeWrapper, attached: false });
}

export function notifyViewAttached(shadowNodeWrapper: ShadowNodeWrapper) {
  queueViewLifecycleOperation({ shadowNodeWrapper, attached: true });
}

// ANIMATIONS

// Keyframes

export function registerCSSKeyframes(
  animationName: string,
  compoundComponentName: string,
  keyframesConfig: NormalizedCSSAnimationKeyframesConfig
) {
  ReanimatedModule.registerCSSKeyframes(
    animationName,
    compoundComponentName,
    keyframesConfig
  );
}

export function unregisterCSSKeyframes(
  animationName: string,
  compoundComponentName: string
) {
  ReanimatedModule.unregisterCSSKeyframes(animationName, compoundComponentName);
}

// View animations

export function applyCSSAnimations(
  shadowNodeWrapper: ShadowNodeWrapper,
  compoundComponentName: string,
  animationUpdates: CSSAnimationUpdates
) {
  ReanimatedModule.applyCSSAnimations(
    shadowNodeWrapper,
    compoundComponentName,
    animationUpdates
  );
}

export function unregisterCSSAnimations(viewTag: number) {
  ReanimatedModule.unregisterCSSAnimations(viewTag);
}

// TRANSITIONS

export function runCSSTransition(
  shadowNodeWrapper: ShadowNodeWrapper,
  transitionConfig: CSSTransitionConfig,
  eventMask: number
) {
  ReanimatedModule.runCSSTransition(
    shadowNodeWrapper,
    transitionConfig,
    eventMask
  );
}

export function unregisterCSSTransition(viewTag: number) {
  ReanimatedModule.unregisterCSSTransition(viewTag);
}

export function registerPseudoStyles(
  shadowNodeWrapper: ShadowNodeWrapper,
  config: CSSPseudoStyleConfig
) {
  ReanimatedModule.registerPseudoStyles(shadowNodeWrapper, config);
}

export function unregisterPseudoStyles(viewTag: number) {
  ReanimatedModule.unregisterPseudoStyles(viewTag);
}
