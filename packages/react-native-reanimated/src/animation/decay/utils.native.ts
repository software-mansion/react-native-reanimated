'use strict';

export type {
  DecayAnimation,
  DecayConfig,
  DefaultDecayConfig,
  InnerDecayAnimation,
  RubberBandDecayConfig,
} from './utilsCommon';
export { isValidRubberBandConfig, SLOPE_FACTOR } from './utilsCommon';

export const VELOCITY_EPS = 1;
