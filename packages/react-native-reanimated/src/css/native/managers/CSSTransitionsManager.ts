'use strict';
import type { UnknownRecord } from '../../../common';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import type {
  CSSTransitionProperties,
  ICSSTransitionsManager,
} from '../../types';
import { getChangedProps } from '../../utils';
import { normalizeCSSTransitionProperties } from '../normalization';
import {
  registerCSSTransition,
  unregisterCSSTransition,
  updateCSSTransition,
} from '../proxy';
import type {
  CSSTransitionUpdates,
  NormalizedCSSTransitionConfig,
  NormalizedSingleCSSTransitionSettings,
} from '../types';

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
    const previousConfig = this.transitionConfig;

    this.previousStyle = style;
    this.transitionConfig = transitionProperties
      ? normalizeCSSTransitionProperties(transitionProperties)
      : null;

    if (!this.transitionConfig) {
      this.detach();
      return;
    }

    const propertyDiff = getChangedProps(
      previousStyle,
      style,
      this.transitionConfig.properties === 'all'
        ? undefined
        : this.transitionConfig.properties
    );

    if (!propertyDiff) {
      return;
    }

    const settingsDiff = previousConfig
      ? this.getSettingsUpdates(this.transitionConfig, previousConfig)
      : null;

    if (!previousConfig) {
      registerCSSTransition(this.shadowNodeWrapper, {
        properties: propertyDiff,
        settings: this.transitionConfig.settings,
      });
    } else {
      const updates: CSSTransitionUpdates = {
        properties: propertyDiff,
      };

      if (settingsDiff) {
        updates.settings = settingsDiff;
      }

      updateCSSTransition(this.viewTag, updates);
    }
  }

  unmountCleanup(): void {
    // noop
  }

  private detach() {
    if (this.transitionConfig) {
      unregisterCSSTransition(this.viewTag);
    }
    this.transitionConfig = null;
    this.previousStyle = null;
  }

  private getSettingsUpdates(
    oldConfig: NormalizedCSSTransitionConfig,
    newConfig: NormalizedCSSTransitionConfig
  ): Record<string, Partial<NormalizedSingleCSSTransitionSettings>> | null {
    const diff: Record<
      string,
      Partial<NormalizedSingleCSSTransitionSettings>
    > = {};

    for (const [property, newSettings] of Object.entries(newConfig.settings)) {
      const settingsDiff = this.getPropertySettingsDiff(
        oldConfig.settings[property],
        newSettings
      );

      if (settingsDiff) {
        diff[property] = settingsDiff;
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }

  private getPropertySettingsDiff(
    oldSettings: NormalizedSingleCSSTransitionSettings | undefined,
    newSettings: NormalizedSingleCSSTransitionSettings
  ): Partial<NormalizedSingleCSSTransitionSettings> | null {
    if (!oldSettings) {
      return newSettings;
    }

    const settingsDiff: Partial<NormalizedSingleCSSTransitionSettings> = {};

    if (oldSettings.duration !== newSettings.duration) {
      settingsDiff.duration = newSettings.duration;
    }
    if (oldSettings.delay !== newSettings.delay) {
      settingsDiff.delay = newSettings.delay;
    }
    if (oldSettings.allowDiscrete !== newSettings.allowDiscrete) {
      settingsDiff.allowDiscrete = newSettings.allowDiscrete;
    }
    if (oldSettings.timingFunction !== newSettings.timingFunction) {
      settingsDiff.timingFunction = newSettings.timingFunction;
    }

    return Object.keys(settingsDiff).length > 0 ? settingsDiff : null;
  }
}
