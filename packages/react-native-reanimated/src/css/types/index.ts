'use strict';

import type { CSSAnimationProp } from './animation';
import type { CSSTransitionProp } from './transition';

export type * from './animation';
export type * from './common';
export type * from './config';
export type * from './helpers';
export type * from './interfaces';
export type * from './props';
export type * from './transition';

export type CSSStyleProp = CSSTransitionProp | CSSAnimationProp;
