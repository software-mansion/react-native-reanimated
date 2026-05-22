'use strict';
import type { UnknownRecord } from '../../common';
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

export interface ICSSPseudoStylesManager {
  update(
    pseudoStylesBySelector: Record<
      string,
      { selectorStyle: UnknownRecord; defaultStyle: UnknownRecord }
    > | null,
    transitionProperties: CSSTransitionProperties | null
  ): void;
  unmountCleanup(): void;
}

export interface ICSSManager {
  update(style: CSSStyle | null): void;
  unmountCleanup(): void;
}
