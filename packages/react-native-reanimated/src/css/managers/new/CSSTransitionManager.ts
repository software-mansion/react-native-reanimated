'use strict';
import type { NormalizedCSSTransitionConfig } from '../../platform/native';
import { normalizeCSSTransitionProperties } from '../../platform/native';
import type { CSSTransitionProperties } from '../../types';
import type { ICSSTransitionsManager } from '../../types/interfaces';

export default class CSSTransitionManager implements ICSSTransitionsManager {
  private transitionConfig: NormalizedCSSTransitionConfig | null = null;

  getConfig(): NormalizedCSSTransitionConfig | null {
    return this.transitionConfig;
  }

  update(transitionProperties: CSSTransitionProperties | null): void {
    this.transitionConfig =
      transitionProperties &&
      normalizeCSSTransitionProperties(transitionProperties);
  }
}
