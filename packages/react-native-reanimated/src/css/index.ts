'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import { ReanimatedModule } from '../ReanimatedModule';
import { normalizeConfig } from './normalization';
import type { CSSAnimationConfig, NormalizedCSSAnimationConfig } from './types';

export function registerCSSAnimation(
  shadowNodeWrapper: ShadowNodeWrapper,
  animationId: number,
  animationConfig: CSSAnimationConfig,
  viewStyle: StyleProps
) {
  ReanimatedModule.registerCSSAnimation(
    shadowNodeWrapper,
    animationId,
    normalizeConfig(animationConfig),
    viewStyle
  );
}

export function unregisterCSSAnimation(animationId: number) {
  ReanimatedModule.unregisterCSSAnimation(animationId);
}

export { cubicBezier, linear, steps } from './parametrizedEasings';
export type { NormalizedCSSAnimationConfig, CSSAnimationConfig };
export * from './utils';
export type {
  CSSAnimationKeyframes,
  CSSAnimationTimeUnit as CSSAnimationDuration,
  CSSAnimationTimeUnit as CSSAnimationDelay,
  CSSAnimationIterationCount,
  CSSAnimationDirection,
  CSSAnimationTimingFunction,
} from './types';
