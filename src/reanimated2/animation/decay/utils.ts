'use strict';
import type {
  AnimatableValue,
  AnimationObject,
  Animation,
  ReduceMotion,
  Timestamp,
  RequiredKeys,
} from '../../../reanimated2/commonTypes';
import { isWeb } from '../../PlatformChecker';

const IS_WEB = isWeb();
export const VELOCITY_EPS = IS_WEB ? 1 / 20 : 1;
export const SLOPE_FACTOR = 0.1;

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

export type DecayConfig = {
  deceleration?: number;
  velocityFactor?: number;
  velocity?: number;
  reduceMotion?: ReduceMotion;
} & (
  | {
      rubberBandEffect?: false;
      clamp?: [min: number, max: number];
    }
  | {
      rubberBandEffect: true;
      clamp: [min: number, max: number];
      rubberBandFactor?: number;
    }
);

export type DefaultDecayConfig = RequiredKeys<
  DecayConfig,
  'deceleration' | 'velocityFactor' | 'velocity'
> & { rubberBandFactor: number };

// If user wants to use rubber band decay animation we have to make sure he has provided clamp
export type RubberBandDecayConfig = RequiredKeys<
  DefaultDecayConfig,
  'clamp'
> & { rubberBandEffect: true };

export function isValidRubberBandConfig(
  config: DefaultDecayConfig
): config is RubberBandDecayConfig {
  'worklet';
  return (
    !!config.rubberBandEffect &&
    Array.isArray(config.clamp) &&
    config.clamp.length === 2
  );
}
