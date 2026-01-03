'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../../commonTypes';
import type {
  CSSTransitionProperties,
  ICSSTransitionsManager,
} from '../../types';
import { getChangedProps } from '../../utils';
import { normalizeCSSTransitionProperties } from '../normalization';
import { runCSSTransition, unregisterCSSTransition } from '../proxy';
import type { NormalizedCSSTransitionConfig } from '../types';

export default class CSSTransitionsManager implements ICSSTransitionsManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private transitionConfig: NormalizedCSSTransitionConfig | null = null;
  private lastProps: StyleProps = {};

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  update(
    transitionProperties: CSSTransitionProperties | null,
    props: StyleProps = {}
  ): void {
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

    const propsDiff = getChangedProps(
      this.lastProps,
      props,
      transitionConfig.properties,
      this.transitionConfig?.properties
    );

    // Run transition only if there are changed props
    if (Object.keys(propsDiff).length > 0) {
      runCSSTransition(
        this.shadowNodeWrapper,
        propsDiff,
        transitionConfig.settings
      );
    }

    this.transitionConfig = transitionConfig;
    this.lastProps = props;
  }

  unmountCleanup(): void {
    // noop
  }

  private detach() {
    if (this.transitionConfig) {
      unregisterCSSTransition(this.viewTag);
      this.transitionConfig = null;
      this.lastProps = {};
    }
  }
}
