'use strict';
import type { UnknownRecord } from '../../common';
import type { ExistingCSSAnimationProperties } from './animation';
import type { CSSTransitionProperties } from './transition';

export interface ICSSAnimationsManager {
  update(animationProperties: ExistingCSSAnimationProperties | null): void;
  unmountCleanup(): void;
}

export interface ICSSTransitionsManager {
  update(
    transitionProperties: CSSTransitionProperties | null,
    style: UnknownRecord | null
  ): void;
  unmountCleanup(): void;
}

export interface ICSSManager {
  update(style: UnknownRecord | null): void;
  unmountCleanup(): void;
}
