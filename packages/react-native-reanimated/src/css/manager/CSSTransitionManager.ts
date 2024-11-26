'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import {
  registerCSSTransition,
  unregisterCSSTransition,
  updateCSSTransition,
} from '../native';
import {
  normalizeCSSTransitionConfig,
  getNormalizedCSSTransitionConfigUpdates,
} from '../normalization';
import type {
  CSSTransitionConfig,
  NormalizedCSSTransitionConfig,
} from '../types';

export default class CSSTransitionManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private normalizedConfig: NormalizedCSSTransitionConfig | null = null;

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  private attachTransition(normalizedConfig: NormalizedCSSTransitionConfig) {
    if (!this.normalizedConfig) {
      registerCSSTransition(this.shadowNodeWrapper, normalizedConfig);
      this.normalizedConfig = normalizedConfig;
    }
  }

  detach() {
    if (this.normalizedConfig) {
      unregisterCSSTransition(this.viewTag);
      this.normalizedConfig = null;
    }
  }

  update(transitionConfig: CSSTransitionConfig | null): void {
    if (!transitionConfig) {
      this.detach();
      return;
    }

    const normalizedConfig = normalizeCSSTransitionConfig(transitionConfig);
    if (!normalizedConfig) {
      this.detach();
      return;
    }

    if (this.normalizedConfig) {
      const configUpdates = getNormalizedCSSTransitionConfigUpdates(
        this.normalizedConfig,
        normalizedConfig
      );

      if (Object.keys(configUpdates).length > 0) {
        this.normalizedConfig = normalizedConfig;
        updateCSSTransition(this.viewTag, configUpdates);
      }
    } else {
      this.attachTransition(normalizedConfig);
    }
  }
}
