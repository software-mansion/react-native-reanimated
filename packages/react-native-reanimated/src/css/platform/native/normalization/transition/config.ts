'use strict';
import { ReanimatedError } from '../../../../errors';
import type {
  AnyRecord,
  CSSTransitionProperties,
  CSSTransitionProperty,
} from '../../../../types';
import {
  areArraysEqual,
  convertPropertyToArray,
  deepEqual,
} from '../../../../utils';
import type {
  NormalizedCSSTransitionConfig,
  NormalizedCSSTransitionConfigUpdates,
  NormalizedSingleCSSTransitionSettings,
} from '../../types';
import {
  normalizeDelay,
  normalizeDuration,
  normalizeTimingFunction,
} from '../common';
import { normalizeTransitionBehavior } from './settings';
import type { ExpandedConfigProperties } from './shorthand';
import { parseTransitionShorthand } from './shorthand';

export const ERROR_MESSAGES = {
  invalidTransitionProperty: (
    transitionProperty: CSSTransitionProperty | undefined
  ) => `Invalid transition property "${JSON.stringify(transitionProperty)}"`,
};

function getExpandedConfigProperties(
  config: CSSTransitionProperties
): ExpandedConfigProperties {
  const result: AnyRecord = config.transition
    ? parseTransitionShorthand(config.transition)
    : {};

  for (const [key, value] of Object.entries(config)) {
    result[key] = convertPropertyToArray(value);
  }

  return result as ExpandedConfigProperties;
}

const hasTransitionProperties = (
  transitionProperty: ExpandedConfigProperties['transitionProperty']
): transitionProperty is string[] =>
  !!transitionProperty?.length &&
  transitionProperty.some((prop) => prop !== 'none');

export function normalizeCSSTransitionProperties(
  config: CSSTransitionProperties
): NormalizedCSSTransitionConfig | null {
  const {
    transitionProperty = ['all'],
    transitionDuration,
    transitionTimingFunction,
    transitionDelay,
    transitionBehavior,
  } = getExpandedConfigProperties(config);

  if (!hasTransitionProperties(transitionProperty)) {
    return null;
  }

  const specificProperties: string[] = [];
  let allPropertiesTransition = false;
  const settings: Record<string, NormalizedSingleCSSTransitionSettings> = {};

  // Go from the last to the first property to ensure that the last
  // one entry for the same property is used without having to override
  // it multiple times if specified more than once (we just take the last
  // occurrence and ignore remaining ones)
  for (let i = transitionProperty.length - 1; i >= 0; i--) {
    const property = transitionProperty[i];

    if (property === 'none') {
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidTransitionProperty(config.transitionProperty)
      );
    }
    // Continue if there was a prop with the same name specified later
    // (we don't want to override the last occurrence of the property)
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
      allowDiscrete: normalizeTransitionBehavior(
        transitionBehavior?.[i % transitionBehavior.length]
      ),
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

  return configUpdates;
}
