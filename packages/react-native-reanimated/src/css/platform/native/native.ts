'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../../commonTypes';
import { ReanimatedModule } from '../../../ReanimatedModule';
import type {
  NormalizedCSSAnimationKeyframesConfig,
  NormalizedCSSTransitionConfig,
  NormalizedSingleCSSAnimationSettings,
} from './types';

// COMMON

export function setViewStyle(viewTag: number, style: StyleProps) {
  ReanimatedModule.setViewStyle(viewTag, style);
}

export function removeViewStyle(viewTag: number) {
  ReanimatedModule.removeViewStyle(viewTag);
}

// ANIMATIONS

// Keyframes

export function registerCSSKeyframes(
  animationName: string,
  keyframesConfig: NormalizedCSSAnimationKeyframesConfig
) {
  ReanimatedModule.registerCSSKeyframes(animationName, keyframesConfig);
}

export function unregisterCSSKeyframes(animationName: string) {
  ReanimatedModule.unregisterCSSKeyframes(animationName);
}

// View animations

export function applyCSSAnimations(
  shadowNodeWrapper: ShadowNodeWrapper,
  animationUpdates: {
    animationNames?: string[];
    newSettings?: Record<string, NormalizedSingleCSSAnimationSettings>;
    settingsUpdates?: Record<
      string,
      Partial<NormalizedSingleCSSAnimationSettings>
    >;
  }
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
