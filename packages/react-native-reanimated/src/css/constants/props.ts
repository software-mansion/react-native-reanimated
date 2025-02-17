import type {
  CSSAnimationProp,
  CSSTransitionProp,
  SingleCSSAnimationSettings,
  SingleCSSTransitionProperties,
} from '../types';

export const ANIMATION_PROPS: CSSAnimationProp[] = [
  'animationName',
  'animationDuration',
  'animationTimingFunction',
  'animationDelay',
  'animationIterationCount',
  'animationDirection',
  'animationFillMode',
  'animationPlayState',
  'animation',
];

export const TRANSITION_PROPS: CSSTransitionProp[] = [
  'transitionProperty',
  'transitionDuration',
  'transitionTimingFunction',
  'transitionDelay',
  'transitionBehavior',
  'transition',
];

export const DEFAULT_ANIMATION_SETTINGS: Required<SingleCSSAnimationSettings> =
  {
    animationDuration: 0,
    animationTimingFunction: 'ease',
    animationDelay: 0,
    animationIterationCount: 1,
    animationDirection: 'normal',
    animationFillMode: 'none',
    animationPlayState: 'running',
  };

export const DEFAULT_TRANSITION_PROPERTIES: Required<SingleCSSTransitionProperties> =
  {
    transitionProperty: 'all',
    transitionDuration: 0,
    transitionTimingFunction: 'ease',
    transitionDelay: 0,
    transitionBehavior: 'normal',
  };
