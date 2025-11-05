'use strict';
import type { ExistingCSSAnimationProperties } from './animation';
import type { CSSStyle } from './props';
import type { CSSTransitionProperties } from './transition';

export interface ICSSAnimationsManager {
  update(animationProperties: ExistingCSSAnimationProperties | null): void;
  unmountCleanup(): void;
}

export interface ICSSTransitionsManager {
  update(transitionProperties: CSSTransitionProperties | null): void;
  unmountCleanup(): void;
}

export interface ICSSManager {
  update(style: CSSStyle | null): void;
  unmountCleanup(): void;
}
