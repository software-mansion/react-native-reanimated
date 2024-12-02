'use strict';
import { ReanimatedError } from '../../errors';
import type {
  CSSStyleProps,
  CSSTransitionProperties,
  CSSTransitionProperty,
  NormalizedCSSTransitionConfig,
  NormalizedCSSTransitionConfigUpdates,
  NormalizedSingleCSSTransitionSettings,
} from '../../types';
import {
  areArraysEqual,
  convertConfigPropertiesToArrays,
  deepEqual,
} from '../../utils';
import {
  normalizeDuration,
  normalizeTimingFunction,
  normalizeDelay,
} from '../common';
import { normalizeTransitionBehavior } from './settings';

export const ERROR_MESSAGES = {
  invalidTransitionProperty: (transitionProperty: CSSTransitionProperty) =>
    `Invalid transition property "${JSON.stringify(transitionProperty)}"`,
};

export function normalizeCSSTransitionProperties(
  config: CSSTransitionProperties
): NormalizedCSSTransitionConfig | null {
  const {
    transitionProperty,
    transitionDuration,
    transitionTimingFunction,
    transitionDelay,
  } = convertConfigPropertiesToArrays(config);

  if (
    transitionProperty.length === 0 ||
    (transitionProperty.length === 1 && transitionProperty[0] === 'none')
  ) {
    return null;
  }

  const specificProperties: (keyof CSSStyleProps)[] = [];
  let allPropertiesTransition = false;
  const settings: Record<string, NormalizedSingleCSSTransitionSettings> = {};

  // Go from the last to the first property to ensure that the last
  // one overrides previous ones in case of duplicate properties
  for (let i = transitionProperty.length - 1; i >= 0; i--) {
    const property = transitionProperty[i];

    if (property === 'none') {
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidTransitionProperty(config.transitionProperty)
      );
    }
    if (settings?.[property]) {
      continue;
    }

    if (property === 'all') {
      allPropertiesTransition = true;
    } else {
      specificProperties.push(property);
    }

    settings[property] = {
      duration: normalizeDuration(
        transitionDuration?.[i % transitionDuration.length]
      ),
      timingFunction: normalizeTimingFunction(
        transitionTimingFunction?.[i % transitionTimingFunction.length]
      ),
      delay: normalizeDelay(transitionDelay?.[i % transitionDelay.length]),
    };

    // 'all' transition property overrides all properties before it,
    // so we don't need to process them
    if (allPropertiesTransition) {
      break;
    }
  }

  return {
    properties: allPropertiesTransition ? 'all' : specificProperties.reverse(),
    settings,
    allowDiscrete: normalizeTransitionBehavior(config.transitionBehavior),
  };
}

export function getNormalizedCSSTransitionConfigUpdates(
  oldConfig: NormalizedCSSTransitionConfig,
  newConfig: NormalizedCSSTransitionConfig
): NormalizedCSSTransitionConfigUpdates {
  const configUpdates: NormalizedCSSTransitionConfigUpdates = {};

  if (
    oldConfig.properties !== newConfig.properties &&
    (!Array.isArray(oldConfig.properties) ||
      !Array.isArray(newConfig.properties) ||
      !areArraysEqual(oldConfig.properties, newConfig.properties))
  ) {
    configUpdates.properties = newConfig.properties;
  }

  const newSettingsKeys = Object.keys(newConfig.settings);
  const oldSettingsKeys = Object.keys(oldConfig.settings);

  if (newSettingsKeys.length !== oldSettingsKeys.length) {
    configUpdates.settings = newConfig.settings;
  } else {
    for (const key of newSettingsKeys) {
      if (
        !oldConfig.settings[key] ||
        // TODO - think of a better way to compare settings (necessary for
        // timing functions comparison). Maybe add some custom way instead
        // of deepEqual
        !deepEqual(oldConfig.settings[key], newConfig.settings[key])
      ) {
        configUpdates.settings = newConfig.settings;
        break;
      }
    }
  }

  if (oldConfig.allowDiscrete !== newConfig.allowDiscrete) {
    configUpdates.allowDiscrete = newConfig.allowDiscrete;
  }

  return configUpdates;
}
