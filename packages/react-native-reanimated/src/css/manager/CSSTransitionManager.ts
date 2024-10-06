'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../commonTypes';
import {
  registerCSSTransition,
  unregisterCSSTransition,
  updateCSSTransition,
} from '../native';
import {
  normalizeCSSTransitionConfig,
  getNormalizedCSSTransitionConfigUpdates,
} from '../normalization';
import type { CSSTransitionConfig } from '../types';

export default class CSSTransitionManager {
  private transitionId?: number;
  private normalizedTransitionProperties?: string[];
  private transitionConfig?: CSSTransitionConfig;

  static _nextId = 0;

  private attach(
    transitionConfig: CSSTransitionConfig,
    shadowNodeWrapper: ShadowNodeWrapper,
    style: StyleProps
  ) {
    this.transitionId = CSSTransitionManager._nextId++;
    this.transitionConfig = transitionConfig;

    const normalizedConfig = normalizeCSSTransitionConfig(
      transitionConfig,
      style
    );
    this.normalizedTransitionProperties = normalizedConfig.transitionProperty;

    console.log(normalizedConfig);

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
    transitionConfig: CSSTransitionConfig | null,
    style: StyleProps
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
        transitionConfig,
        style
      );
      this.transitionConfig = transitionConfig;
      this.normalizedTransitionProperties = configUpdates.transitionProperty;

      if (Object.keys(configUpdates).length > 0) {
        updateCSSTransition(this.transitionId, configUpdates);
      }
    } else if (transitionConfig) {
      this.attach(transitionConfig, wrapper, style);
    } else {
      this.detach();
    }
  }
}
