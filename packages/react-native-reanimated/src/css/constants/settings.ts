'use strict';
import type { PredefinedTimingFunction } from '../easing';

export const VALID_PREDEFINED_TIMING_FUNCTIONS: readonly PredefinedTimingFunction[] =
  [
    'linear',
    'ease',
    'ease-in',
    'ease-out',
    'ease-in-out',
    'step-start',
    'step-end',
  ];

export const VALID_PARAMETRIZED_TIMING_FUNCTIONS: readonly string[] = [
  'cubic-bezier',
  'steps',
  'linear',
];
