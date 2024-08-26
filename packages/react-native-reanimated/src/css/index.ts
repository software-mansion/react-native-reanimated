'use strict';
import type { ShadowNodeWrapper } from '../commonTypes';
import { ReanimatedModule } from '../ReanimatedModule';
import { normalizeConfig } from './normalization';
import type { CSSAnimationConfig, NormalizedCSSAnimationConfig } from './types';

export function registerCSSAnimation(
  shadowNodeWrapper: ShadowNodeWrapper,
  config: CSSAnimationConfig
) {
  ReanimatedModule.registerCSSAnimation(
    shadowNodeWrapper,
    normalizeConfig(config)
  );
}

export type { NormalizedCSSAnimationConfig };
