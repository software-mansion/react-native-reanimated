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
  private transitionId?: number;
  private normalizedTransitionProperties?: NormalizedTransitionProperty;
  private transitionConfig?: CSSTransitionConfig;

  static _nextId = 0;

  private attach(
    transitionConfig: CSSTransitionConfig,
    shadowNodeWrapper: ShadowNodeWrapper
  ) {
    this.transitionId = CSSTransitionManager._nextId++;
    this.transitionConfig = transitionConfig;

    const normalizedConfig = normalizeCSSTransitionConfig(transitionConfig);
    this.normalizedTransitionProperties = normalizedConfig.transitionProperty;

    registerCSSTransition(
      shadowNodeWrapper,
      this.transitionId,
      normalizedConfig
    );
  }

  detach() {
    if (this.transitionId !== undefined) {
      unregisterCSSTransition(this.transitionId);
      this.transitionId = undefined;
      this.normalizedTransitionProperties = undefined;
      this.transitionConfig = undefined;
    }
  }

  update(
    wrapper: ShadowNodeWrapper,
    transitionConfig: CSSTransitionConfig | null
  ): void {
    if (
      this.transitionId !== undefined &&
      this.transitionConfig !== undefined &&
      this.normalizedTransitionProperties !== undefined &&
      transitionConfig !== null
    ) {
      const configUpdates = getNormalizedCSSTransitionConfigUpdates(
        this.normalizedTransitionProperties,
        this.transitionConfig,
        transitionConfig
      );

      if (Object.keys(configUpdates).length > 0) {
        this.transitionConfig = transitionConfig;
        this.normalizedTransitionProperties = configUpdates.transitionProperty;
        updateCSSTransition(this.transitionId, configUpdates);
      }
    } else if (transitionConfig) {
      this.attach(transitionConfig, wrapper);
    } else {
      this.detach();
    }
  }
}
