'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../../commonTypes';
import type {
  CSSTransitionProperties,
  ICSSTransitionsManager,
} from '../../types';
import { getChangedProps } from '../../utils';
import {
  getNormalizedCSSTransitionConfigUpdates,
  normalizeCSSTransitionProperties,
} from '../normalization';
import {
  registerCSSTransition,
  runCSSTransition,
  unregisterCSSTransition,
} from '../proxy';
import type { NormalizedCSSTransitionConfig } from '../types';

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
    props: StyleProps | null = null
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

    let configUpdates: Partial<NormalizedCSSTransitionConfig> = {};

    if (this.transitionConfig) {
      // Check if transition config has changed
      configUpdates = getNormalizedCSSTransitionConfigUpdates(
        this.transitionConfig,
        transitionConfig
      );

      // Calculate changed props - only for properties in the transition config
      // When properties is 'all', pass null to check all props
      const allowedProperties =
        transitionConfig.properties === 'all'
          ? null
          : transitionConfig.properties;
      const propsDiff = getChangedProps(
        this.lastProps,
        props,
        allowedProperties
      );

      // Run transition if there are changed props or config updates
      if (
        Object.keys(propsDiff).length > 0 ||
        Object.keys(configUpdates).length > 0
      ) {
        runCSSTransition(this.viewTag, propsDiff, configUpdates);

        // Update stored config if it changed
        if (Object.keys(configUpdates).length > 0) {
          this.transitionConfig = transitionConfig;
        }
      }

      this.lastProps = props;
    } else {
      this.attachTransition(transitionConfig);
      this.lastProps = props;
    }
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

  private attachTransition(transitionConfig: NormalizedCSSTransitionConfig) {
    if (!this.transitionConfig) {
      registerCSSTransition(this.shadowNodeWrapper, transitionConfig);
      this.transitionConfig = transitionConfig;
    }
  }
}
