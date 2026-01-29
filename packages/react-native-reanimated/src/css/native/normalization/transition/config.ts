'use strict';
import type { AnyRecord } from '../../../../common';
import { convertPropertyToArray, ReanimatedError } from '../../../../common';
import type {
  CSSTransitionProperties,
  CSSTransitionProperty,
} from '../../../types';
import type {
  NormalizedCSSTransitionConfig,
  NormalizedSingleCSSTransitionSettings,
} from '../../types';
import {
  normalizeDelay,
  normalizeDuration,
  normalizeTimingFunction,
} from '../common';
import { normalizeTransitionBehavior } from './settings';
import type { ExpandedCSSTransitionConfigProperties } from './shorthand';
import {
  createEmptyTransitionConfig,
  parseTransitionShorthand,
} from './shorthand';

export const ERROR_MESSAGES = {
  invalidTransitionProperty: (
    transitionProperty: CSSTransitionProperty | undefined | string[]
  ) => `Invalid transition property "${JSON.stringify(transitionProperty)}"`,
};

function getExpandedConfigProperties(
  config: CSSTransitionProperties
): ExpandedCSSTransitionConfigProperties {
  const result: AnyRecord = config.transition
    ? parseTransitionShorthand(config.transition)
    : createEmptyTransitionConfig();

  for (const [key, value] of Object.entries(config)) {
    result[key] = convertPropertyToArray(value);
  }

  return result as ExpandedCSSTransitionConfigProperties;
}

const hasTransition = ({
  transitionProperty,
  ...rest
}: ExpandedCSSTransitionConfigProperties) => {
  if (transitionProperty.length) {
    const hasNone = transitionProperty[0] === 'none';

    // We allow either all values to be 'none' or none of them to be 'none'
    if (transitionProperty.some((prop) => (prop === 'none') !== hasNone)) {
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidTransitionProperty(transitionProperty)
      );
    }

    return !hasNone;
  }

  // transitionProperty defaults to 'all' if not specified but there are
  // other transition properties
  return Object.values(rest).some((value) => value.length);
};

export function normalizeCSSTransitionProperties(
  config: CSSTransitionProperties
): NormalizedCSSTransitionConfig | null {
  const expandedProperties = getExpandedConfigProperties(config);

  if (!hasTransition(expandedProperties)) {
    return null;
  }

  const {
    transitionProperty,
    transitionDuration,
    transitionTimingFunction,
    transitionDelay,
    transitionBehavior,
  } = expandedProperties;
  const specificProperties: string[] = [];
  let allPropertiesTransition = false;
  const settings: Record<string, NormalizedSingleCSSTransitionSettings> = {};

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
      duration: normalizeDuration(
        transitionDuration[i % transitionDuration.length]
      ),
      timingFunction: normalizeTimingFunction(
        transitionTimingFunction[i % transitionTimingFunction.length]
      ),
      delay: normalizeDelay(transitionDelay[i % transitionDelay.length]),
      allowDiscrete: normalizeTransitionBehavior(
        transitionBehavior[i % transitionBehavior.length]
      ),
    };

    // 'all' transition property overrides all properties before it,
    // so we don't need to process them
    if (allPropertiesTransition) {
      break;
    }
  }

  return {
    properties: allPropertiesTransition
      ? undefined
      : specificProperties.reverse(),
    settings,
  };
}
