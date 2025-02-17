'use strict';
import { DEFAULT_TRANSITION_PROPERTIES } from '../../../constants';
import type {
  AnyRecord,
  ConvertValuesToArrays,
  CSSTransitionProp,
  CSSTransitionProperties,
} from '../../../types';
import {
  convertPropertyToArray,
  parseSingleTransitionShorthand,
  splitByComma,
} from '../../../utils';

type ExpandedCSSTransitionConfigProperties = Record<
  Exclude<CSSTransitionProp, 'transition'>,
  string[]
>;

const createEmptyTransitionConfig =
  (): ExpandedCSSTransitionConfigProperties => ({
    transitionProperty: [],
    transitionDuration: [],
    transitionTimingFunction: [],
    transitionDelay: [],
    transitionBehavior: [],
  });

function parseTransitionShorthand(value: string) {
  const defaultEntries = Object.entries(DEFAULT_TRANSITION_PROPERTIES);

  return splitByComma(value).reduce<ExpandedCSSTransitionConfigProperties>(
    (acc, part) => {
      const result = parseSingleTransitionShorthand(part);

      defaultEntries.forEach(([propertyName, defaultValue]) => {
        const k = propertyName as keyof typeof result;
        acc[k].push(String(result[k] ?? defaultValue));
      });

      return acc;
    },
    createEmptyTransitionConfig()
  );
}

type NormalizedCSSTransitionProperties = ConvertValuesToArrays<
  Omit<CSSTransitionProperties, 'transition'>
>;

export function normalizeCSSTransitionProperties(
  config: CSSTransitionProperties
): NormalizedCSSTransitionProperties {
  const result: AnyRecord = config.transition
    ? parseTransitionShorthand(config.transition)
    : createEmptyTransitionConfig();

  for (const [key, value] of Object.entries(config)) {
    result[key] = convertPropertyToArray(value);
  }

  return result as NormalizedCSSTransitionProperties;
}
