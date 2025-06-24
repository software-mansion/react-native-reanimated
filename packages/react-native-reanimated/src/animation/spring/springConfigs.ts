'use strict';

import type { SpringConfig } from './springUtils';

export const Reanimated3DefaultSpringConfig = {
  damping: 10,
  mass: 1,
  stiffness: 100,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
  // ts-prune-ignore-next
} as const satisfies SpringConfig;

export const WigglySpringConfig = {
  damping: 100,
  mass: 4,
  stiffness: 900,
  // ts-prune-ignore-next
} as const satisfies SpringConfig;

export const GentleSpringConfig = {
  damping: 120,
  mass: 4,
  stiffness: 900,
  // ts-prune-ignore-next
} as const;

export const SnappySpringConfig = {
  damping: 110,
  mass: 4,
  stiffness: 900,
  overshootClamping: true,
  // ts-prune-ignore-next
} as const satisfies SpringConfig;
