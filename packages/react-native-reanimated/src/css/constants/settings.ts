'use strict';
import type { PredefinedTimingFunction, StepsModifier } from '../easings';
import type { CSSAnimationSettingProp, CSSTransitionProp } from '../types';

export const ANIMATION_SETTINGS: CSSAnimationSettingProp[] = [
  'animationDuration',
  'animationTimingFunction',
  'animationDelay',
  'animationIterationCount',
  'animationDirection',
  'animationFillMode',
  'animationPlayState',
];

export const TRANSITION_PROPS: CSSTransitionProp[] = [
  'transitionProperty',
  'transitionDuration',
  'transitionTimingFunction',
  'transitionDelay',
  'transitionBehavior',
  'transition',
];

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
