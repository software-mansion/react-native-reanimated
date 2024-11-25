'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import { ReanimatedModule } from '../ReanimatedModule';
import type {
  NormalizedSingleCSSAnimationConfig,
  NormalizedSingleCSSAnimationSettings,
  NormalizedCSSTransitionConfig,
} from './types';

export function setViewStyle(viewTag: number, style: StyleProps) {
  ReanimatedModule.setViewStyle(viewTag, style);
}

export function removeViewStyle(viewTag: number) {
  ReanimatedModule.removeViewStyle(viewTag);
}

export function registerCSSAnimation(
  shadowNodeWrapper: ShadowNodeWrapper,
  animationId: number,
  animationConfig: NormalizedSingleCSSAnimationConfig
) {
  ReanimatedModule.registerCSSAnimation(
    shadowNodeWrapper,
    animationId,
    animationConfig
  );
}

export function updateCSSAnimation(
  animationId: number,
  settingsUpdates: Partial<NormalizedSingleCSSAnimationSettings>
) {
  ReanimatedModule.updateCSSAnimation(animationId, settingsUpdates);
}

export function unregisterCSSAnimation(animationId: number) {
  ReanimatedModule.unregisterCSSAnimation(animationId);
}

export function registerCSSTransition(
  shadowNodeWrapper: ShadowNodeWrapper,
  transitionConfig: NormalizedCSSTransitionConfig
) {
  ReanimatedModule.registerCSSTransition(shadowNodeWrapper, transitionConfig);
}

export function updateCSSTransition(
  viewTag: number,
  settingsUpdates: Partial<NormalizedCSSTransitionConfig>
) {
  ReanimatedModule.updateCSSTransition(viewTag, settingsUpdates);
}

export function unregisterCSSTransition(viewTag: number) {
  ReanimatedModule.unregisterCSSTransition(viewTag);
}
