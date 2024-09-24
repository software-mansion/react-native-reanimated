'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import { ReanimatedModule } from '../ReanimatedModule';
import {
  normalizeAnimationConfig,
  normalizeTransitionConfig,
} from './normalization';
import type {
  CSSAnimationConfig,
  NormalizedCSSAnimationConfig,
  CSSTransitionConfig,
} from './types';

export function registerCSSAnimation(
  shadowNodeWrapper: ShadowNodeWrapper,
  animationId: number,
  animationConfig: CSSAnimationConfig,
  viewStyle: StyleProps
) {
  ReanimatedModule.registerCSSAnimation(
    shadowNodeWrapper,
    animationId,
    normalizeAnimationConfig(animationConfig),
    viewStyle
  );
}

export function updateCSSAnimation(
  animationId: number,
  animationConfig: CSSAnimationConfig,
  viewStyle: StyleProps
) {
  ReanimatedModule.updateCSSAnimation(
    animationId,
    // TODO - improve this not to normalize every time
    normalizeAnimationConfig(animationConfig),
    viewStyle
  );
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
  transitionConfig: CSSTransitionConfig,
  viewStyle: StyleProps
) {
  ReanimatedModule.registerCSSTransition(
    shadowNodeWrapper,
    transitionId,
    normalizeTransitionConfig(transitionConfig, viewStyle),
    viewStyle
  );
}

export function updateCSSTransition(
  transitionId: number,
  transitionConfig: CSSTransitionConfig,
  viewStyle: StyleProps
) {
  ReanimatedModule.updateCSSTransition(
    transitionId,
    // TODO - improve this not to normalize every time
    normalizeTransitionConfig(transitionConfig, viewStyle),
    viewStyle
  );
}

export function unregisterCSSTransition(transitionId: number) {
  ReanimatedModule.unregisterCSSTransition(transitionId);
}

export { cubicBezier, linear, steps } from './parametrizedEasings';
export type {
  NormalizedCSSAnimationConfig,
  CSSAnimationConfig,
  CSSTransitionConfig,
};
export * from './utils';
export type {
  CSSAnimationKeyframes,
  CSSAnimationTimeUnit as CSSAnimationDuration,
  CSSAnimationTimeUnit as CSSAnimationDelay,
  CSSAnimationIterationCount,
  CSSAnimationDirection,
  CSSAnimationTimingFunction,
  CSSAnimationFillMode,
  CSSTransitionProperty,
} from './types';
