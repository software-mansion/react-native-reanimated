'use strict';
import type { ViewStyle } from 'react-native';
import type { ShadowNodeWrapper } from './commonTypes';
import { ReanimatedModule } from './ReanimatedModule';

// TODO: support other keyframe types
type CSSKeyframeKey = 'from' | 'to' | `${number}%`;

// TODO: support other units
type CSSAnimationDuration = `${number}s` | `${number}ms` | number;

type CSSKeyframes = Record<CSSKeyframeKey, ViewStyle>;

export interface CSSAnimationConfig {
  animationName: CSSKeyframes;
  animationDuration: CSSAnimationDuration;
}

export function registerCSSAnimation(
  shadowNodeWrapper: ShadowNodeWrapper,
  config: CSSAnimationConfig
) {
  ReanimatedModule.registerCSSAnimation(shadowNodeWrapper, config);
}
