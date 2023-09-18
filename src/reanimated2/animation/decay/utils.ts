'use strict';
import type {
  AnimatableValue,
  AnimationObject,
  Animation,
  ReduceMotion,
  Timestamp,
} from '../../../reanimated2/commonTypes';
import { isWeb } from '../../PlatformChecker';

const IS_WEB = isWeb();
export const VELOCITY_EPS = IS_WEB ? 1 / 20 : 1;
export const SLOPE_FACTOR = 0.1;

export type DecayConfig = Partial<Omit<DefaultDecayConfig, 'rubberBandFactor'>>;
export type WithDecayConfig = DecayConfig;

export interface DecayAnimation extends Animation<DecayAnimation> {
  lastTimestamp: Timestamp;
  startTimestamp: Timestamp;
  initialVelocity: number;
  velocity: number;
  current: AnimatableValue;
}

export interface InnerDecayAnimation
  extends Omit<DecayAnimation, 'current'>,
    AnimationObject {
  current: number;
  springActive?: boolean;
}
export interface DefaultDecayConfig {
  deceleration: number;
  velocityFactor: number;
  clamp?: number[];
  velocity: number;
  reduceMotion?: ReduceMotion;
  rubberBandEffect?: boolean;
  rubberBandFactor: number;
}

export function validateConfig(config: DefaultDecayConfig): void {
  'worklet';
  if (config.clamp) {
    if (!Array.isArray(config.clamp)) {
      throw new Error(
        `[Reanimated] \`config.clamp\` must be an array but is ${typeof config.clamp}.`
      );
    }
    if (config.clamp.length !== 2) {
      throw new Error(
        `[Reanimated] \`clamp array\` must contain 2 items but is given ${config.clamp.length}.`
      );
    }
  }
  if (config.velocityFactor <= 0) {
    throw new Error(
      `[Reanimated] \`config.velocityFactor\` must be greather then 0 but is ${config.velocityFactor}.`
    );
  }
  if (config.rubberBandEffect && !config.clamp) {
    throw new Error(
      '[Reanimated] You need to set `clamp` property when using `rubberBandEffect`.'
    );
  }
}
