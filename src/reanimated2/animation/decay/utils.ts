import type { AnimationObject, AnimatableValue } from '../../../index.web';
import { isWeb } from '../../../reanimated2/PlatformChecker';
import type {
  Timestamp,
  Animation,
  ReduceMotion,
} from '../../../reanimated2/commonTypes';

const IS_WEB = isWeb();

export const VELOCITY_EPS = IS_WEB ? 1 / 20 : 1;
export const SLOPE_FACTOR = 0.1;

export interface InnerDecayAnimation
  extends Omit<DecayAnimation, 'current'>,
    AnimationObject {
  current: number;
}

export interface DecayAnimation extends Animation<DecayAnimation> {
  lastTimestamp: Timestamp;
  startTimestamp: Timestamp;
  initialVelocity: number;
  velocity: number;
  current: AnimatableValue;
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
