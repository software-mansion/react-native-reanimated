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
  NormalizedTransitionProperty,
} from '../types';

export default class CSSTransitionManager {
  private viewTag?: number;
  private normalizedTransitionProperties?: NormalizedTransitionProperty;
  private transitionConfig?: CSSTransitionConfig;

  private attach(
    shadowNodeWrapper: ShadowNodeWrapper,
    viewTag: number,
    transitionConfig: CSSTransitionConfig
  ) {
    const normalizedConfig = normalizeCSSTransitionConfig(transitionConfig);

    this.viewTag = viewTag;
    this.transitionConfig = transitionConfig;
    this.normalizedTransitionProperties = normalizedConfig.transitionProperty;

    registerCSSTransition(shadowNodeWrapper, normalizedConfig);
  }

  detach() {
    if (this.viewTag !== undefined) {
      unregisterCSSTransition(this.viewTag);
      this.viewTag = undefined;
      this.normalizedTransitionProperties = undefined;
      this.transitionConfig = undefined;
    }
  }

  update(
    wrapper: ShadowNodeWrapper,
    viewTag: number,
    transitionConfig: CSSTransitionConfig | null
  ): void {
    if (transitionConfig) {
      if (
        this.viewTag === viewTag &&
        this.transitionConfig !== undefined &&
        this.normalizedTransitionProperties !== undefined
      ) {
        const configUpdates = getNormalizedCSSTransitionConfigUpdates(
          this.normalizedTransitionProperties,
          this.transitionConfig,
          transitionConfig
        );

        if (Object.keys(configUpdates).length > 0) {
          this.transitionConfig = transitionConfig;
          if (configUpdates.transitionProperty) {
            this.normalizedTransitionProperties =
              configUpdates.transitionProperty;
          }
          updateCSSTransition(viewTag, configUpdates);
        }
      } else {
        // This is added just for safety but there should be no transition
        // in this case
        this.detach();
        this.attach(wrapper, viewTag, transitionConfig);
      }
    } else {
      this.detach();
    }
  }
}
