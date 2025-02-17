import { DEFAULT_ANIMATION_SETTINGS } from '../../../constants';
import type {
  AnyRecord,
  ConvertValuesToArrays,
  CSSAnimationProp,
  CSSAnimationProperties,
} from '../../../types';
import {
  convertPropertyToArray,
  parseSingleAnimationShorthand,
  splitByComma,
} from '../../../utils';

type ExpandedCSSAnimationConfigProperties = Record<
  Exclude<CSSAnimationProp, 'animation'>,
  string[]
>;

const createEmptyAnimationConfig =
  (): ExpandedCSSAnimationConfigProperties => ({
    animationName: [],
    animationDuration: [],
    animationTimingFunction: [],
    animationDelay: [],
    animationIterationCount: [],
    animationDirection: [],
    animationFillMode: [],
    animationPlayState: [],
  });

function parseAnimationShorthand(value: string) {
  const defaultEntries = Object.entries(DEFAULT_ANIMATION_SETTINGS);

  return splitByComma(value).reduce<ExpandedCSSAnimationConfigProperties>(
    (acc, part) => {
      const result = parseSingleAnimationShorthand(part);

      if (!result.animationName) {
        return acc;
      }

      defaultEntries.forEach(([propertyName, defaultValue]) => {
        const k = propertyName as keyof typeof result;
        acc[k].push(String(result[k] ?? defaultValue));
      });

      return acc;
    },
    createEmptyAnimationConfig()
  );
}

export type NormalizedCSSAnimationProperties = ConvertValuesToArrays<
  Omit<CSSAnimationProperties, 'animation'>
>;

export function normalizeCSSAnimationProperties(
  config: CSSAnimationProperties
): NormalizedCSSAnimationProperties {
  const result: AnyRecord = config.animation
    ? parseAnimationShorthand(config.animation)
    : createEmptyAnimationConfig();

  for (const [key, value] of Object.entries(config)) {
    result[key] = convertPropertyToArray(value);
  }

  return result as NormalizedCSSAnimationProperties;
}
