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
  private viewTag?: number;
  private normalizedConfig?: NormalizedCSSTransitionConfig;

  private attach(
    shadowNodeWrapper: ShadowNodeWrapper,
    viewTag: number,
    transitionConfig: CSSTransitionConfig
  ) {
    const normalizedConfig = normalizeCSSTransitionConfig(transitionConfig);
    if (!normalizedConfig) {
      return;
    }

    this.viewTag = viewTag;
    this.normalizedConfig = normalizedConfig;

    registerCSSTransition(shadowNodeWrapper, normalizedConfig);
  }

  detach() {
    if (this.viewTag !== undefined) {
      unregisterCSSTransition(this.viewTag);
      this.viewTag = undefined;
      this.normalizedConfig = undefined;
    }
  }

  update(
    wrapper: ShadowNodeWrapper,
    viewTag: number,
    transitionConfig: CSSTransitionConfig | null
  ): void {
    if (transitionConfig) {
      const normalizedConfig = normalizeCSSTransitionConfig(transitionConfig);

      if (
        this.viewTag === viewTag &&
        this.normalizedConfig !== undefined &&
        normalizedConfig
      ) {
        const configUpdates = getNormalizedCSSTransitionConfigUpdates(
          this.normalizedConfig,
          normalizedConfig
        );

        if (Object.keys(configUpdates).length > 0) {
          this.normalizedConfig = normalizedConfig;
          updateCSSTransition(viewTag, configUpdates);
        }
      } else {
        this.detach(); // This detach is added just for safety, it should not be needed
        this.attach(wrapper, viewTag, transitionConfig);
      }
    } else {
      this.detach();
    }
  }
}
