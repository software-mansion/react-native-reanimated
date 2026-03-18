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
  let allPropertiesTransition = false;
  const settings: Record<string, NormalizedSingleCSSTransitionSettings> = {};
  const specificProperties = new Set<string>();
  const processedProperties = new Set<string>();

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
    // We always respect the last occurrence of a property, even if it gets
    // pruned as inactive. That means earlier occurrences must be ignored.
    if (processedProperties.has(property)) {
      continue;
    }
    processedProperties.add(property);

    const duration = normalizeDuration(
      transitionDuration[i % transitionDuration.length]
    );
    const delay = normalizeDelay(transitionDelay[i % transitionDelay.length]);

    // Skip if effective duration is 0 (the transition would be immediate so there is no need
    // to apply it and we can just treat it as a plain render without a transition)
    if (duration + delay <= 0) {
      continue;
    }

    const timingFunction = normalizeTimingFunction(
      transitionTimingFunction[i % transitionTimingFunction.length]
    );
    const allowDiscrete = normalizeTransitionBehavior(
      transitionBehavior[i % transitionBehavior.length]
    );

    settings[property] = { duration, timingFunction, delay, allowDiscrete };

    // 'all' transition property overrides all properties before it,
    // so we don't need to process them
    if (property === 'all') {
      allPropertiesTransition = true;
      break;
    }

    specificProperties.add(property);
  }

  if (allPropertiesTransition) {
    return { specificProperties: undefined, settings };
  }
  if (specificProperties.size) {
    return { specificProperties, settings };
  }

  return null;
}
