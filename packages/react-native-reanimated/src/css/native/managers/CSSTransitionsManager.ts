'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../../commonTypes';
import type {
  CSSTransitionProperties,
  ICSSTransitionsManager,
} from '../../types';
import { getChangedProps } from '../../utils';
import { normalizeCSSTransitionProperties } from '../normalization';
import { runCSSTransition, unregisterCSSTransition } from '../proxy';
import type {
  CSSTransitionConfig,
  NormalizedCSSTransitionConfig,
} from '../types';

export default class CSSTransitionsManager implements ICSSTransitionsManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private transitionConfig: NormalizedCSSTransitionConfig | null = null;
  private lastProps: StyleProps | null = null;

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

    if (this.lastProps) {
      const propsDiff = getChangedProps(
        this.lastProps,
        props,
        transitionConfig.properties,
        this.transitionConfig?.properties
      );

      // Run transition only if there are changed props
      const changedProps = Object.keys(propsDiff);
      if (changedProps.length > 0) {
        this.transitionConfig = transitionConfig;
        const config = this.createTransitionConfig(
          changedProps,
          transitionConfig,
          propsDiff
        );
        runCSSTransition(this.shadowNodeWrapper, config);
      }
    }

    this.lastProps = props;
  }

  unmountCleanup(): void {
    // noop
  }

  private detach() {
    if (this.transitionConfig) {
      unregisterCSSTransition(this.viewTag);
      this.transitionConfig = null;
      this.lastProps = null;
    }
  }

  private createTransitionConfig(
    changedProps: string[],
    transitionConfig: NormalizedCSSTransitionConfig,
    propsDiff: StyleProps
  ): CSSTransitionConfig {
    const config: CSSTransitionConfig = {};
    for (const prop of changedProps) {
      const change = propsDiff[prop];
      if (change === null) {
        config[prop] = null;
        continue;
      }
      const propertySettings =
        transitionConfig.settings[prop] ?? transitionConfig.settings.all;
      config[prop] = {
        ...propertySettings,
        value: change as [unknown, unknown],
      };
    }
    return config;
  }
}
