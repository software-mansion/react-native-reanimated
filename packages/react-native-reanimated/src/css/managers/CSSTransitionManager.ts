'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import {
  registerCSSTransition,
  unregisterCSSTransition,
  updateCSSTransition,
} from '../native';
import {
  normalizeCSSTransitionProperties,
  getNormalizedCSSTransitionConfigUpdates,
} from '../normalization';
import type {
  CSSTransitionProperties,
  NormalizedCSSTransitionConfig,
} from '../types';

export default class CSSTransitionManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private transitionConfig: NormalizedCSSTransitionConfig | null = null;

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  private attachTransition(transitionConfig: NormalizedCSSTransitionConfig) {
    if (!this.transitionConfig) {
      registerCSSTransition(this.shadowNodeWrapper, transitionConfig);
      this.transitionConfig = transitionConfig;
    }
  }

  detach() {
    if (this.transitionConfig) {
      unregisterCSSTransition(this.viewTag);
      this.transitionConfig = null;
    }
  }

  update(transitionProperties: CSSTransitionProperties | null): void {
    if (!transitionProperties) {
      this.detach();
      return;
    }

    const transitionConfig =
      normalizeCSSTransitionProperties(transitionProperties);
    if (!transitionConfig) {
      this.detach();
      return;
    }

    if (this.transitionConfig) {
      const configUpdates = getNormalizedCSSTransitionConfigUpdates(
        this.transitionConfig,
        transitionConfig
      );

      if (Object.keys(configUpdates).length > 0) {
        this.transitionConfig = transitionConfig;
        updateCSSTransition(this.viewTag, configUpdates);
      }
    } else {
      this.attachTransition(transitionConfig);
    }
  }
}
