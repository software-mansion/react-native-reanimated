'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../commonTypes';
import { ReanimatedModule } from '../../ReanimatedModule';
import type {
  CSSAnimationUpdates,
  NormalizedCSSAnimationKeyframesConfig,
  NormalizedCSSTransitionConfig,
} from './types';

// COMMON

export function setViewStyle(viewTag: number, style: StyleProps) {
  ReanimatedModule.setViewStyle(viewTag, style);
}

export function markNodeAsRemovable(shadowNodeWrapper: ShadowNodeWrapper) {
  ReanimatedModule.markNodeAsRemovable(shadowNodeWrapper);
}

export function unmarkNodeAsRemovable(viewTag: number) {
  ReanimatedModule.unmarkNodeAsRemovable(viewTag);
}

// ANIMATIONS

// Keyframes

export function registerCSSKeyframes(
  animationName: string,
  viewName: string,
  keyframesConfig: NormalizedCSSAnimationKeyframesConfig
) {
  ReanimatedModule.registerCSSKeyframes(
    animationName,
    viewName,
    keyframesConfig
  );
}

export function unregisterCSSKeyframes(
  animationName: string,
  viewName: string
) {
  ReanimatedModule.unregisterCSSKeyframes(animationName, viewName);
}

// View animations

export function applyCSSAnimations(
  shadowNodeWrapper: ShadowNodeWrapper,
  animationUpdates: CSSAnimationUpdates
) {
  ReanimatedModule.applyCSSAnimations(shadowNodeWrapper, animationUpdates);
}

export function unregisterCSSAnimations(viewTag: number) {
  ReanimatedModule.unregisterCSSAnimations(viewTag);
}

// TRANSITIONS

export function registerCSSTransition(
  shadowNodeWrapper: ShadowNodeWrapper,
  transitionConfig: NormalizedCSSTransitionConfig
) {
  ReanimatedModule.registerCSSTransition(shadowNodeWrapper, transitionConfig);
}

export function updateCSSTransition(
  viewTag: number,
  configUpdates: Partial<NormalizedCSSTransitionConfig>
) {
  ReanimatedModule.updateCSSTransition(viewTag, configUpdates);
}

export function unregisterCSSTransition(viewTag: number) {
  ReanimatedModule.unregisterCSSTransition(viewTag);
}
