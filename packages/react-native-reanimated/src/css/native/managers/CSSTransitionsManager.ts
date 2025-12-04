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
    const transitionConfig = transitionProperties
      ? normalizeCSSTransitionProperties(transitionProperties)
      : null;

    if (!transitionConfig) {
      this.detach();
      return;
    }

    const propertyDiff = this.getPropertyDiff(
      previousStyle,
      style,
      previousConfig,
      transitionConfig
    );

    if (!propertyDiff) {
      return;
    }

    const settingsDiff = previousConfig
      ? this.getSettingsUpdates(previousConfig, transitionConfig)
      : null;

    if (!previousConfig) {
      registerCSSTransition(this.shadowNodeWrapper, {
        properties: propertyDiff,
        settings: transitionConfig.settings,
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
    this.transitionConfig = transitionConfig;
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

  private getPropertyDiff(
    previousStyle: UnknownRecord | null,
    nextStyle: UnknownRecord | null,
    previousConfig: NormalizedCSSTransitionConfig | null,
    nextConfig: NormalizedCSSTransitionConfig
  ): Record<string, [unknown, unknown] | null> | null {
    const trackedProperties =
      nextConfig.properties === 'all' ? undefined : nextConfig.properties;

    const changedProps = getChangedProps(
      previousStyle,
      nextStyle,
      trackedProperties
    );

    const removedPropsDiff = this.getRemovedPropertiesDiff(
      previousStyle,
      previousConfig,
      nextConfig
    );

    const combinedDiff = {
      ...changedProps,
      ...removedPropsDiff,
    };

    return Object.keys(combinedDiff).length > 0 ? combinedDiff : null;
  }

  private getRemovedPropertiesDiff(
    previousStyle: UnknownRecord | null,
    previousConfig: NormalizedCSSTransitionConfig | null,
    nextConfig: NormalizedCSSTransitionConfig
  ): Record<string, null> {
    if (!previousConfig || !previousStyle) {
      return {};
    }

    const nextProperties = nextConfig.properties;
    if (nextProperties === 'all') {
      return {};
    }

    const previousProperties =
      previousConfig.properties === 'all'
        ? Object.keys(previousStyle)
        : previousConfig.properties;

    const diff: Record<string, null> = {};

    for (const property of previousProperties) {
      if (previousStyle[property] !== undefined) {
        diff[property] = null;
      }
    }

    for (const property of nextProperties) {
      delete diff[property];
    }

    return diff;
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
