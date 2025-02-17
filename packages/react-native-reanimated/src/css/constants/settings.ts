'use strict';
import type { PredefinedTimingFunction, StepsModifier } from '../easings';

export const VALID_STEPS_MODIFIERS: StepsModifier[] = [
  'jump-start',
  'start',
  'jump-end',
  'end',
  'jump-none',
  'jump-both',
];

export const VALID_PREDEFINED_TIMING_FUNCTIONS: PredefinedTimingFunction[] = [
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
];

export const VALID_PARAMETRIZED_TIMING_FUNCTIONS: string[] = [
  'cubic-bezier',
  'steps',
  'linear',
];
