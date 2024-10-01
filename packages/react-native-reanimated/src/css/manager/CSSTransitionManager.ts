'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../commonTypes';
import { registerCSSTransition, unregisterCSSTransition } from '../native';
import { normalizeCSSTransitionConfig } from '../normalization';
import type { CSSTransitionConfig } from '../types';
import type CSSIdManager from './CSSIdManager';

export default class CSSTransitionManager {
  private readonly cssIdManager: CSSIdManager;

  private transitionId?: number;

  constructor(cssIdManager: CSSIdManager) {
    this.cssIdManager = cssIdManager;
  }

  attach(
    transitionConfig: CSSTransitionConfig,
    shadowNodeWrapper: ShadowNodeWrapper,
    style: StyleProps
  ) {
    this.transitionId = this.cssIdManager.getId();

    registerCSSTransition(
      shadowNodeWrapper,
      this.transitionId,
      normalizeCSSTransitionConfig(transitionConfig, style)
    );
  }

  detach() {
    if (this.transitionId !== undefined) {
      unregisterCSSTransition(this.transitionId);
      this.transitionId = undefined;
    }
  }

  update(
    wrapper: ShadowNodeWrapper,
    transitionConfig: CSSTransitionConfig | null,
    newStyle: StyleProps
  ): void {
    // TODO - implement
    console.log(
      'CSSTransitionManager.update',
      wrapper,
      transitionConfig,
      newStyle
    );
  }
}
