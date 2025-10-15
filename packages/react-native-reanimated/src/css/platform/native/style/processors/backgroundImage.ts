import type { ValueProcessor } from '../types';
import {
  type LinearGradientBackgroundImage,
  processLinearGradient,
} from './gradients';

export const ERROR_MESSAGES = {
  invalidBackgroundImage: (value: string) =>
    `Invalid background image: ${value}`,
};

export function parseCssFunction(
  value: string
): { name: string; params: string[] } | null {
  const match = value.match(/^([a-zA-Z0-9-]+)\((.*)\)$/);
  if (!match) return null;

  const [, name, paramStr] = match;

  const paramRegex = /(?:[^,(]+|\([^)]*\))+/g;
  const params = Array.from(paramStr.matchAll(paramRegex), (m) => m[0].trim());

  return { name, params };
}

export const processBackgroundImage: ValueProcessor<
  string | LinearGradientBackgroundImage
> = (value) => {
  if (typeof value === 'object') {
    return value;
  }

  const parsed = parseCssFunction(value);
  if (!parsed) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidBackgroundImage(value));
  }

  const { name, params } = parsed;

  switch (name) {
    case 'linear-gradient':
      return processLinearGradient(params);
    default:
      throw new ReanimatedError(ERROR_MESSAGES.invalidBackgroundImage(value));
  }
};
