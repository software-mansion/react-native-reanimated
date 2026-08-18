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
  private appliedEventMask = 0;

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  /**
   * @returns Whether this update detached a running transition (its props were
   *   removed, or normalized to an empty config, e.g. when duration is 0).
   */
  update(
    transitionProperties: CSSTransitionProperties | null,
    nextStyle?: UnknownRecord,
    eventMask = 0
  ): boolean {
    const transitionConfig =
      transitionProperties &&
      normalizeCSSTransitionProperties(transitionProperties);

    const nextProps = nextStyle ?? {};
    const prevProps = this.prevProps;
    // Only a real style snapshot can serve as a baseline. Keeping the empty
    // stand-in the caller passes when it builds none would make a later attach
    // diff every property against undefined, animating it from its default.
    this.prevProps = nextStyle ?? null;

    // If there were no previous props, the view is just mounted so we
    // don't trigger any transitions yet. Also, when there is no transition
    // config, we don't trigger any transitions.
    if (!prevProps || !transitionConfig) {
      if (this.hasTransition) {
        this.detach();
        return true;
      }
      return false;
    }

    // Trigger transition for changed properties only
    const config = this.processTransitionConfig(
      prevProps,
      nextProps,
      transitionConfig
    );

    if (Object.keys(config).length) {
      this.appliedEventMask = eventMask;
      runCSSTransition(this.shadowNodeWrapper, config, eventMask);
      this.hasTransition = true;
    } else if (this.hasTransition && eventMask !== this.appliedEventMask) {
      // Only the mask changed, but the native side still has to learn about it.
      this.appliedEventMask = eventMask;
      runCSSTransition(this.shadowNodeWrapper, {}, eventMask);
    }

    return false;
  }

  unmountCleanup(): void {
    // noop
  }

  private detach() {
    unregisterCSSTransition(this.viewTag);
    this.propsWithTransitions.clear();
    this.hasTransition = false;
    this.appliedEventMask = 0;
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
