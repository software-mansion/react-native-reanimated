'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import { ReanimatedModule } from '../ReanimatedModule';
import type {
  CSSAnimationConfig,
  NormalizedCSSAnimationConfig,
  CSSTransitionConfig,
  NormalizedCSSAnimationSettings,
  NormalizedCSSTransitionConfig,
} from './types';

export function registerCSSAnimation(
  shadowNodeWrapper: ShadowNodeWrapper,
  animationId: number,
  animationConfig: NormalizedCSSAnimationConfig,
  viewStyle: StyleProps
) {
  ReanimatedModule.registerCSSAnimation(
    shadowNodeWrapper,
    animationId,
    animationConfig,
    viewStyle
  );
}

export function updateCSSAnimation(
  animationId: number,
  updatedSettings: Partial<NormalizedCSSAnimationSettings>,
  viewStyle: StyleProps
) {
  ReanimatedModule.updateCSSAnimation(animationId, updatedSettings, viewStyle);
}

export function unregisterCSSAnimation(
  animationId: number,
  revertChanges: boolean
) {
  ReanimatedModule.unregisterCSSAnimation(animationId, revertChanges);
}

export function registerCSSTransition(
  shadowNodeWrapper: ShadowNodeWrapper,
  transitionId: number,
  transitionConfig: NormalizedCSSTransitionConfig,
  viewStyle: StyleProps
) {
  ReanimatedModule.registerCSSTransition(
    shadowNodeWrapper,
    transitionId,
    transitionConfig,
    viewStyle
  );
}

export function updateCSSTransition(
  transitionId: number,
  transitionConfig: NormalizedCSSTransitionConfig,
  viewStyle: StyleProps
) {
  ReanimatedModule.updateCSSTransition(
    transitionId,
    transitionConfig,
    viewStyle
  );
}

export function unregisterCSSTransition(transitionId: number) {
  ReanimatedModule.unregisterCSSTransition(transitionId);
}

export { cubicBezier, linear, steps } from './easings';
export type {
  NormalizedCSSAnimationConfig,
  CSSAnimationConfig,
  CSSTransitionConfig,
};
export * from './utils';
export {
  normalizeAnimationConfig,
  normalizeAnimationSettings,
  normalizeTransitionConfig,
} from './normalization';
export type {
  CSSAnimationKeyframes,
  CSSAnimationTimeUnit as CSSAnimationDuration,
  CSSAnimationTimeUnit as CSSAnimationDelay,
  CSSAnimationIterationCount,
  CSSAnimationDirection,
  CSSAnimationTimingFunction,
  CSSAnimationFillMode,
  CSSAnimationSettings,
  CSSTransitionProperty,
  NormalizedCSSAnimationSettings,
  NormalizedCSSTransitionConfig,
} from './types';
