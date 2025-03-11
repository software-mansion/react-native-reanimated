'use strict';

import type { CSSAnimationProp } from './animation';
import type { CSSTransitionProp } from './transition';

export * from './animation';
export * from './common';
export * from './config';
export * from './helpers';
export * from './interfaces';
export * from './props';
export * from './transition';

export type CSSStyleProp = CSSTransitionProp | CSSAnimationProp;
