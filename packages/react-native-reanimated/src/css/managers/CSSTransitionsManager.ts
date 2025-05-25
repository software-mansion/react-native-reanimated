'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import type { NormalizedCSSTransitionConfig } from '../platform/native';
import {
  getNormalizedCSSTransitionConfigUpdates,
  normalizeCSSTransitionProperties,
} from '../platform/native';
import {
  registerCSSTransition,
  unregisterCSSTransition,
  updateCSSTransition,
} from '../platform/native/native';
import type { CSSTransitionProperties } from '../types';
import type { ICSSTransitionsManager } from '../types/interfaces';

export default class CSSTransitionsManager implements ICSSTransitionsManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private transitionConfig: NormalizedCSSTransitionConfig | null = null;

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
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

  unmountCleanup(): void {
    // noop
  }

  private detach() {
    if (this.transitionConfig) {
      unregisterCSSTransition(this.viewTag);
      this.transitionConfig = null;
    }
  }

  private attachTransition(transitionConfig: NormalizedCSSTransitionConfig) {
    if (!this.transitionConfig) {
      registerCSSTransition(this.shadowNodeWrapper, transitionConfig);
      this.transitionConfig = transitionConfig;
    }
  }
}
