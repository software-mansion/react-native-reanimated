'use strict';

import { ReanimatedError } from '../../../../common';
import { areArraysEqual, convertPropertyToArray, deepEqual } from '../../../utils';
import { normalizeDelay, normalizeDuration, normalizeTimingFunction } from '../common';
import { normalizeTransitionBehavior } from './settings';
import { createEmptyTransitionConfig, parseTransitionShorthand } from './shorthand';
export const ERROR_MESSAGES = {
  invalidTransitionProperty: transitionProperty => `Invalid transition property "${JSON.stringify(transitionProperty)}"`
};
function getExpandedConfigProperties(config) {
  const result = config.transition ? parseTransitionShorthand(config.transition) : createEmptyTransitionConfig();
  for (const [key, value] of Object.entries(config)) {
    result[key] = convertPropertyToArray(value);
  }
  return result;
}
const hasTransition = ({
  transitionProperty,
  ...rest
}) => {
  if (transitionProperty.length) {
    const hasNone = transitionProperty[0] === 'none';

    // We allow either all values to be 'none' or none of them to be 'none'
    if (transitionProperty.some(prop => prop === 'none' !== hasNone)) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidTransitionProperty(transitionProperty));
    }
    return !hasNone;
  }

  // transitionProperty defaults to 'all' if not specified but there are
  // other transition properties
  return Object.values(rest).some(value => value.length);
};
export function normalizeCSSTransitionProperties(config) {
  const expandedProperties = getExpandedConfigProperties(config);
  if (!hasTransition(expandedProperties)) {
    return null;
  }
  const {
    transitionProperty,
    transitionDuration,
    transitionTimingFunction,
    transitionDelay,
    transitionBehavior
  } = expandedProperties;
  const specificProperties = [];
  let allPropertiesTransition = false;
  const settings = {};
  if (!transitionProperty.length) {
    // For cases when transition property hasn't been explicitly specified
    // (e.g. when only the transitionDuration is set)
    transitionProperty.push('all');
  }

  // Go from the last to the first property to ensure that the last
  // one entry for the same property is used without having to override
  // it multiple times if specified more than once (we just take the last
  // occurrence and ignore remaining ones)
  for (let i = transitionProperty.length - 1; i >= 0; i--) {
    const property = transitionProperty[i];
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
      duration: normalizeDuration(transitionDuration[i % transitionDuration.length]),
      timingFunction: normalizeTimingFunction(transitionTimingFunction[i % transitionTimingFunction.length]),
      delay: normalizeDelay(transitionDelay[i % transitionDelay.length]),
      allowDiscrete: normalizeTransitionBehavior(transitionBehavior[i % transitionBehavior.length])
    };

    // 'all' transition property overrides all properties before it,
    // so we don't need to process them
    if (allPropertiesTransition) {
      break;
    }
  }
  return {
    properties: allPropertiesTransition ? 'all' : specificProperties.reverse(),
    settings
  };
}
export function getNormalizedCSSTransitionConfigUpdates(oldConfig, newConfig) {
  const configUpdates = {};
  if (oldConfig.properties !== newConfig.properties && (!Array.isArray(oldConfig.properties) || !Array.isArray(newConfig.properties) || !areArraysEqual(oldConfig.properties, newConfig.properties))) {
    configUpdates.properties = newConfig.properties;
  }
  const newSettingsKeys = Object.keys(newConfig.settings);
  const oldSettingsKeys = Object.keys(oldConfig.settings);
  if (newSettingsKeys.length !== oldSettingsKeys.length) {
    configUpdates.settings = newConfig.settings;
  } else {
    for (const key of newSettingsKeys) {
      if (!oldConfig.settings[key] ||
      // TODO - think of a better way to compare settings (necessary for
      // timing functions comparison). Maybe add some custom way instead
      // of deepEqual
      !deepEqual(oldConfig.settings[key], newConfig.settings[key])) {
        configUpdates.settings = newConfig.settings;
        break;
      }
    }
  }
  return configUpdates;
}
//# sourceMappingURL=config.js.map