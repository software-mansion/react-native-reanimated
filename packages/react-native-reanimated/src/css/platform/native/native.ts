import type { ShadowNodeWrapper, StyleProps } from '../../../commonTypes';
import { ReanimatedModule } from '../../../ReanimatedModule';
import type {
  NormalizedCSSTransitionConfig,
  NormalizedSingleCSSAnimationConfig,
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

export function registerCSSAnimations(
  shadowNodeWrapper: ShadowNodeWrapper,
  animationConfigs: NormalizedSingleCSSAnimationConfig[]
) {
  ReanimatedModule.registerCSSAnimations(shadowNodeWrapper, animationConfigs);
}

export function updateCSSAnimations(
  viewTag: number,
  settingsUpdates: {
    index: number;
    settings: Partial<NormalizedSingleCSSAnimationSettings>;
  }[]
) {
  ReanimatedModule.updateCSSAnimations(viewTag, settingsUpdates);
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
