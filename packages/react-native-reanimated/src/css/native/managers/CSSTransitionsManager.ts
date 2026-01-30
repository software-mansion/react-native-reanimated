'use strict';
import type { UnknownRecord } from '../../../common';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import type {
  CSSTransitionProperties,
  ICSSTransitionsManager,
} from '../../types';
import { deepEqual } from '../../utils';
import { normalizeCSSTransitionProperties } from '../normalization';
import { runCSSTransition, unregisterCSSTransition } from '../proxy';
import type {
  CSSTransitionConfig,
  NormalizedCSSTransitionConfig,
} from '../types';

export default class CSSTransitionsManager implements ICSSTransitionsManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private lastAppliedProps: UnknownRecord | null = null;

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  update(
    transitionProperties: CSSTransitionProperties | null,
    props: UnknownRecord = {}
  ): void {
    const transitionConfig =
      transitionProperties &&
      normalizeCSSTransitionProperties(transitionProperties);

    if (!transitionConfig) {
      this.detach();
      return;
    }

    const prevProps = this.lastAppliedProps; // Active props from last update
    const nextProps: UnknownRecord = {}; // Active props from this update

    // Filter new props based on the new transition config
    if (!transitionConfig.properties) {
      Object.assign(nextProps, props);
    } else {
      for (const property of transitionConfig.properties) {
        if (property in props) {
          nextProps[property] = props[property];
        }
      }
    }

    this.lastAppliedProps = nextProps;

    if (!prevProps) {
      return;
    }

    const config = this.buildTransitionConfig(
      prevProps,
      nextProps,
      transitionConfig
    );

    if (Object.keys(config).length) {
      runCSSTransition(this.shadowNodeWrapper, config);
    }
  }

  unmountCleanup(): void {
    // noop
  }

  private detach() {
    if (this.lastAppliedProps) {
      unregisterCSSTransition(this.viewTag);
      this.lastAppliedProps = null;
    }
  }

  private buildTransitionConfig(
    oldProps: UnknownRecord,
    newProps: UnknownRecord,
    newTransitionConfig: NormalizedCSSTransitionConfig
  ): CSSTransitionConfig {
    const result: CSSTransitionConfig = {};

    const newTransitionProperties = newTransitionConfig.properties;
    const allowedProperties = !newTransitionProperties
      ? null
      : new Set(newTransitionProperties);

    // Get property changes which we want to trigger transitions for
    for (const key in newProps) {
      const newValue = newProps[key];
      const oldValue = oldProps[key];

      if (!deepEqual(oldValue, newValue)) {
        result[key] = {
          ...this.getPropertySettings(key, newTransitionConfig),
          value: [oldValue, newValue],
        };
      }
    }

    // Clear up old properties that are no longer allowed
    for (const key in oldProps) {
      if (allowedProperties && !allowedProperties.has(key)) {
        result[key] = null;
      } else if (!(key in newProps)) {
        // Property was removed from props but is still allowed
        result[key] = {
          ...this.getPropertySettings(key, newTransitionConfig),
          value: [oldProps[key], undefined],
        };
      }
    }

    return result;
  }

  private getPropertySettings(
    property: string,
    config: NormalizedCSSTransitionConfig
  ) {
    return config.settings[property] ?? config.settings.all;
  }
}
