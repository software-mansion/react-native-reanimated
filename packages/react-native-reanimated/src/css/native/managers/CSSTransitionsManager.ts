'use strict';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import type { UnknownRecord } from '../../../common';
import type {
  CSSTransitionProperties,
  ICSSTransitionsManager,
} from '../../types';
import {
  getNormalizedCSSTransitionConfigUpdates,
  normalizeCSSTransitionProperties,
} from '../normalization';
import {
  registerCSSTransition,
  unregisterCSSTransition,
  updateCSSTransition,
} from '../proxy';
import type { NormalizedCSSTransitionConfig } from '../types';
import { getChangedProps } from '../../utils';

export default class CSSTransitionsManager implements ICSSTransitionsManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private transitionConfig: NormalizedCSSTransitionConfig | null = null;
  private previousStyle: UnknownRecord | null = null;

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  update(
    transitionProperties: CSSTransitionProperties | null,
    style: UnknownRecord | null
  ): void {
    const previousStyle = this.previousStyle;
    this.previousStyle = style;

    const transitionConfig = transitionProperties
      ? normalizeCSSTransitionProperties(transitionProperties)
      : null;

    if (!transitionConfig) {
      this.detach();
      return;
    }

    getChangedProps(previousStyle, style, transitionConfig.properties);

    if (!this.transitionConfig) {
      this.attachTransition(transitionConfig);
      return;
    }

    const configUpdates = getNormalizedCSSTransitionConfigUpdates(
      this.transitionConfig,
      transitionConfig
    );

    if (Object.keys(configUpdates).length > 0) {
      this.transitionConfig = transitionConfig;
      updateCSSTransition(this.viewTag, configUpdates);
    }

    this.previousStyle = style;
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
