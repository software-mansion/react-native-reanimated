'use strict';
import type { CSSAnimationProp } from './animation';
import type {
  CSSTransitionCallbackProp,
  CSSTransitionProp,
} from './transition';

export type * from './animation';
export type * from './common';
export type * from './gradients';
export type * from './helpers';
export type * from './interfaces';
export type * from './props';
export type * from './pseudo';
export type * from './transition';

export type CSSConfigProp =
  | CSSTransitionProp
  | CSSAnimationProp
  | CSSTransitionCallbackProp;
