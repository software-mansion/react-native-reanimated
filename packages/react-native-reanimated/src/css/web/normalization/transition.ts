'use strict';
import type {
  AnyRecord,
  CSSTransitionProp,
  CSSTransitionProperties,
} from '../../types';
import {
  convertPropertyToArray,
  parseSingleTransitionShorthand,
  splitByComma,
} from '../../utils';

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
  return splitByComma(value).reduce<ExpandedCSSTransitionConfigProperties>(
    (acc, part) => {
      const result = parseSingleTransitionShorthand(part);
      acc.transitionProperty.push(result.transitionProperty ?? 'all');
      acc.transitionDuration.push(
        result.transitionDuration ? String(result.transitionDuration) : '0s'
      );
      acc.transitionTimingFunction.push(
        result.transitionTimingFunction ?? 'ease'
      );
      acc.transitionDelay.push(
        result.transitionDelay ? String(result.transitionDelay) : '0s'
      );
      acc.transitionBehavior.push(result.transitionBehavior ?? 'normal');
      return acc;
    },
    createEmptyTransitionConfig()
  );
}

export function normalizeCSSTransitionProperties(
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
