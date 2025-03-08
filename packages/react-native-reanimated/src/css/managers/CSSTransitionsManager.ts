'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import type { NormalizedCSSTransitionConfig } from '../platform/native';
import {
  cssUpdatesQueue,
  getNormalizedCSSTransitionConfigUpdates,
  normalizeCSSTransitionProperties,
  registerCSSTransitionUpdate,
  unregisterCSSTransitionUpdate,
  updateCSSTransitionUpdate,
} from '../platform/native';
import type { CSSTransitionProperties } from '../types';

export default class CSSTransitionsManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private transitionConfig: NormalizedCSSTransitionConfig | null = null;

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  private attachTransition(transitionConfig: NormalizedCSSTransitionConfig) {
    if (!this.transitionConfig) {
      cssUpdatesQueue.add(
        registerCSSTransitionUpdate(this.shadowNodeWrapper, transitionConfig)
      );
      this.transitionConfig = transitionConfig;
    }
  }

  detach() {
    if (this.transitionConfig) {
      cssUpdatesQueue.add(unregisterCSSTransitionUpdate(this.viewTag));
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
        cssUpdatesQueue.add(
          updateCSSTransitionUpdate(this.viewTag, configUpdates)
        );
      }
    } else {
      this.attachTransition(transitionConfig);
    }
  }
}
