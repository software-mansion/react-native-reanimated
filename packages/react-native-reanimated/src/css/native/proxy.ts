'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../commonTypes';
import { ReanimatedModule } from '../../ReanimatedModule';
import type {
  CSSAnimationUpdates,
  CSSTransitionConfig,
  NormalizedCSSAnimationKeyframesConfig,
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
  reactViewName: string,
  keyframesConfig: NormalizedCSSAnimationKeyframesConfig
) {
  ReanimatedModule.registerCSSKeyframes(
    animationName,
    reactViewName,
    keyframesConfig
  );
}

export function unregisterCSSKeyframes(
  animationName: string,
  reactViewName: string
) {
  ReanimatedModule.unregisterCSSKeyframes(animationName, reactViewName);
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

export function runCSSTransition(
  shadowNodeWrapper: ShadowNodeWrapper,
  transitionConfig: CSSTransitionConfig
) {
  ReanimatedModule.runCSSTransition(shadowNodeWrapper, transitionConfig);
}

export function unregisterCSSTransition(viewTag: number) {
  ReanimatedModule.unregisterCSSTransition(viewTag);
}
