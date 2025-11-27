'use strict';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import type { UnknownRecord } from '../../../common';
import type {
  CSSTransitionProperties,
  ICSSTransitionsManager,
} from '../../types';
import { normalizeCSSTransitionProperties } from '../normalization';
import {
  registerCSSTransition,
  updateCSSTransition,
  unregisterCSSTransition,
} from '../proxy';
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
    const previousConfig = this.transitionConfig;

    const transitionConfig = transitionProperties
      ? normalizeCSSTransitionProperties(transitionProperties)
      : null;

    if (!transitionConfig) {
      this.detach();
      return;
    }

    const propertyDiff =
      transitionConfig.properties.length > 0
        ? getChangedProps(previousStyle, style, transitionConfig.properties)
        : null;

    this.previousStyle = style;

    if (propertyDiff) {
      if (!previousConfig) {
        registerCSSTransition(this.shadowNodeWrapper, {
          properties: propertyDiff,
          settings: transitionConfig.settings,
        });
      } else {
        const updates: CSSTransitionUpdates = {
          properties: propertyDiff,
        };

        const settingsDiff = this.getSettingsUpdates(
          transitionConfig,
          previousConfig
        );

        if (settingsDiff) {
          updates.settings = settingsDiff;
        }

        updateCSSTransition(this.viewTag, updates);
      }
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

  private getSettingsUpdates(
    newConfig: NormalizedCSSTransitionConfig,
    previousConfig: NormalizedCSSTransitionConfig
  ): Record<string, Partial<NormalizedSingleCSSTransitionSettings>> | null {
    const diff: Record<
      string,
      Partial<NormalizedSingleCSSTransitionSettings>
    > = {};

    for (const [property, nextSettings] of Object.entries(newConfig.settings)) {
      const perPropertyDiff = this.getPropertySettingsDiff(
        previousConfig.settings[property],
        nextSettings
      );

      if (perPropertyDiff) {
        diff[property] = perPropertyDiff;
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }

  private getPropertySettingsDiff(
    previousSettings: NormalizedSingleCSSTransitionSettings | undefined,
    nextSettings: NormalizedSingleCSSTransitionSettings
  ): Partial<NormalizedSingleCSSTransitionSettings> | null {
    if (!previousSettings) {
      return nextSettings;
    }

    const settingsDiff: Partial<NormalizedSingleCSSTransitionSettings> = {};

    if (previousSettings.duration !== nextSettings.duration) {
      settingsDiff.duration = nextSettings.duration;
    }
    if (previousSettings.delay !== nextSettings.delay) {
      settingsDiff.delay = nextSettings.delay;
    }
    if (previousSettings.allowDiscrete !== nextSettings.allowDiscrete) {
      settingsDiff.allowDiscrete = nextSettings.allowDiscrete;
    }
    if (previousSettings.timingFunction !== nextSettings.timingFunction) {
      settingsDiff.timingFunction = nextSettings.timingFunction;
    }

    return Object.keys(settingsDiff).length > 0 ? settingsDiff : null;
  }
}
