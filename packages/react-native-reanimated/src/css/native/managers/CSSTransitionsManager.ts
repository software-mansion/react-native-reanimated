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

  // All props from the previous update
  private prevProps: UnknownRecord | null = null;
  // Stores all properties for which transition was triggered before
  // and which haven't been cleaned up yet (null if no transition was attached before)
  private propsWithTransitions = new Set<string>();
  // Indicates whether a CSS transition is currently attached to the view
  private hasTransition = false;

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  update(
    transitionProperties: CSSTransitionProperties | null,
    nextProps: UnknownRecord = {}
  ): void {
    const transitionConfig =
      transitionProperties &&
      normalizeCSSTransitionProperties(transitionProperties);

    const prevProps = this.prevProps;
    this.prevProps = nextProps;

    // If there were no previous props, the view is just mounted so we
    // don't trigger any transitions yet. Also, when there is no transition
    // config, we don't trigger any transitions.
    if (!prevProps || !transitionConfig) {
      if (this.hasTransition) {
        this.detach();
      }
      return;
    }

    // Trigger transition for changed properties only
    const config = this.processTransitionConfig(
      prevProps,
      nextProps,
      transitionConfig
    );

    if (Object.keys(config).length) {
      runCSSTransition(this.shadowNodeWrapper, config);
      this.hasTransition = true;
    }
  }

  unmountCleanup(): void {
    // noop
  }

  private detach() {
    unregisterCSSTransition(this.viewTag);
    this.propsWithTransitions.clear();
    this.hasTransition = false;
  }

  private processTransitionConfig(
    oldProps: UnknownRecord,
    newProps: UnknownRecord,
    newTransitionConfig: NormalizedCSSTransitionConfig
  ): CSSTransitionConfig {
    const result: CSSTransitionConfig = {};

    const specificProperties = newTransitionConfig.specificProperties;

    const isAllowedProperty = (property: string) =>
      !specificProperties || specificProperties.has(property);

    const getPropertySettings = (property: string) =>
      newTransitionConfig.settings[property] ??
      newTransitionConfig.settings.all;

    const triggerTransition = (property: string) => {
      result[property] = {
        ...getPropertySettings(property),
        value: [oldProps[property], newProps[property]],
      };
      this.propsWithTransitions.add(property);
    };

    // Get property changes which we want to trigger transitions for
    for (const key in newProps) {
      if (isAllowedProperty(key) && !deepEqual(newProps[key], oldProps[key])) {
        triggerTransition(key);
      }
    }

    // Handle old props; for no longer allowed ones, cancel the transition
    // immediately; for ones that are allowed but were removed, trigger a transition
    // to undefined (to the default value for the property).
    for (const key in oldProps) {
      if (!isAllowedProperty(key)) {
        if (this.propsWithTransitions.has(key)) {
          // If a property was transitioned before but is no longer allowed,
          // we need to clear it up immediately
          result[key] = null;
          this.propsWithTransitions.delete(key);
        }
      } else if (!(key in newProps)) {
        // Property was removed from props but is still allowed
        triggerTransition(key);
      }
    }

    return result;
  }
}
