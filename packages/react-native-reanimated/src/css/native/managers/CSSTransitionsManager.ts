'use strict';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import type { UnknownRecord } from '../../../common';
import type {
  CSSTransitionProperties,
  ICSSTransitionsManager,
} from '../../types';
import { normalizeCSSTransitionProperties } from '../normalization';
import { applyCSSTransition, unregisterCSSTransition } from '../proxy';
import type {
  CSSTransitionUpdates,
  NormalizedCSSTransitionConfig,
  NormalizedSingleCSSTransitionSettings,
} from '../types';
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

    const propertyDiff = getChangedProps(
      previousStyle,
      style,
      transitionConfig.properties
    );

    if (!propertyDiff) {
      return;
    }

    const transitionUpdates = this.getTransitionUpdates(
      transitionConfig,
      propertyDiff
    );

    this.transitionConfig = transitionConfig;

    if (transitionUpdates) {
      applyCSSTransition(this.shadowNodeWrapper, transitionUpdates);
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

  private getTransitionUpdates(
    newConfig: NormalizedCSSTransitionConfig,
    propertyDiff: Record<string, [unknown, unknown]>
  ): CSSTransitionUpdates | null {
    const previousConfig = this.transitionConfig;

    if (!previousConfig) {
      return {
        properties: propertyDiff,
        settings: newConfig.settings,
      };
    }

    const updates: CSSTransitionUpdates = {};

    if (propertyDiff) {
      updates.properties = propertyDiff;
    }

    const settingsDiff = this.getSettingsUpdates(newConfig, previousConfig);

    if (settingsDiff) {
      updates.settings = settingsDiff;
    }

    return Object.keys(updates).length > 0 ? updates : null;
  }

  private getSettingsUpdates(
    newConfig: NormalizedCSSTransitionConfig,
    previousConfig: NormalizedCSSTransitionConfig
  ): Record<string, Partial<NormalizedSingleCSSTransitionSettings>> | null {
    const diff: Record<
      string,
      Partial<NormalizedSingleCSSTransitionSettings>
    > = {};

    for (const [property, settings] of Object.entries(newConfig.settings)) {
      const previousSettings = previousConfig.settings[property];

      if (!previousSettings) {
        diff[property] = settings;
        continue;
      }

      const propertyDiff = this.getSettingsDiff(previousSettings, settings);

      if (propertyDiff) {
        diff[property] = propertyDiff;
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }

  private getSettingsDiff(
    previousSettings: NormalizedSingleCSSTransitionSettings,
    nextSettings: NormalizedSingleCSSTransitionSettings
  ): Partial<NormalizedSingleCSSTransitionSettings> | null {
    const diff: Partial<NormalizedSingleCSSTransitionSettings> = {};

    if (previousSettings.duration !== nextSettings.duration) {
      diff.duration = nextSettings.duration;
    }
    if (previousSettings.delay !== nextSettings.delay) {
      diff.delay = nextSettings.delay;
    }
    if (previousSettings.allowDiscrete !== nextSettings.allowDiscrete) {
      diff.allowDiscrete = nextSettings.allowDiscrete;
    }
    if (previousSettings.timingFunction !== nextSettings.timingFunction) {
      diff.timingFunction = nextSettings.timingFunction;
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }
}
