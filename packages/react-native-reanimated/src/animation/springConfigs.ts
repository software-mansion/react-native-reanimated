'use strict';

import type { SpringConfig } from './springUtils';

export const Reanimated3DefaultSpringConfig = {
  damping: 10,
  mass: 1,
  stiffness: 100,
} as const satisfies SpringConfig;

export const Reanimated3DefaultSpringConfigWithDuration = {
  duration: 1333,
  dampingRatio: 0.5,
} as const satisfies SpringConfig;

export const WigglySpringConfig = {
  damping: 100,
  mass: 4,
  stiffness: 900,
} as const satisfies SpringConfig;

export const WigglySpringConfigWithDuration = {
  duration: 550,
  dampingRatio: 0.83,
} as const satisfies SpringConfig;

export const GentleSpringConfig = {
  damping: 120,
  mass: 4,
  stiffness: 900,
} as const satisfies SpringConfig;

export const GentleSpringConfigWithDuration = {
  duration: 550,
  dampingRatio: 1,
} as const satisfies SpringConfig;

export const SnappySpringConfig = {
  damping: 110,
  mass: 4,
  stiffness: 900,
  overshootClamping: true,
} as const satisfies SpringConfig;

export const SnappySpringConfigWithDuration = {
  duration: 550,
  dampingRatio: 0.92,
  overshootClamping: true,
} as const satisfies SpringConfig;
