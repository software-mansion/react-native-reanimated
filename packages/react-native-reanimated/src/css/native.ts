'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import { ReanimatedModule } from '../ReanimatedModule';
import type {
  NormalizedCSSAnimationConfig,
  NormalizedCSSAnimationSettings,
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
  animationConfig: NormalizedCSSAnimationConfig
) {
  ReanimatedModule.registerCSSAnimation(
    shadowNodeWrapper,
    animationId,
    animationConfig
  );
}

export function updateCSSAnimation(
  animationId: number,
  updatedSettings: Partial<NormalizedCSSAnimationSettings>
) {
  ReanimatedModule.updateCSSAnimation(animationId, updatedSettings);
}

export function unregisterCSSAnimation(animationId: number) {
  ReanimatedModule.unregisterCSSAnimation(animationId);
}

export function registerCSSTransition(
  shadowNodeWrapper: ShadowNodeWrapper,
  transitionId: number,
  transitionConfig: NormalizedCSSTransitionConfig
) {
  ReanimatedModule.registerCSSTransition(
    shadowNodeWrapper,
    transitionId,
    transitionConfig
  );
}

export function updateCSSTransition(
  transitionId: number,
  transitionConfig: NormalizedCSSTransitionConfig
) {
  ReanimatedModule.updateCSSTransition(transitionId, transitionConfig);
}

export function unregisterCSSTransition(transitionId: number) {
  ReanimatedModule.unregisterCSSTransition(transitionId);
}
