'use strict';
import type { ShadowNodeWrapper } from '../commonTypes';
import { ReanimatedModule } from '../ReanimatedModule';
import { normalizeConfig } from './normalization';
import type { CSSAnimationConfig, NormalizedCSSAnimationConfig } from './types';

export function registerCSSAnimation(
  shadowNodeWrapper: ShadowNodeWrapper,
  animationId: number,
  config: CSSAnimationConfig
) {
  ReanimatedModule.registerCSSAnimation(
    shadowNodeWrapper,
    animationId,
    normalizeConfig(config)
  );
}

export function unregisterCSSAnimation(animationId: number) {
  ReanimatedModule.unregisterCSSAnimation(animationId);
}

export type { NormalizedCSSAnimationConfig, CSSAnimationConfig };
export * from './utils';
