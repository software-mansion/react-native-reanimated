'use strict';
'worklet';
import { ReanimatedError } from '../../errors';
import type { TransformOrigin, ValueProcessor } from '..';

type KeywordConversions = Record<string, `${number}%` | number>;
type ComponentParser = (
  component: string | number,
  keywords?: KeywordConversions
) => string | number;

export const ERROR_MESSAGES = {
  invalidTransformOrigin: (value: TransformOrigin) =>
    `Invalid transformOrigin: ${JSON.stringify(value)}. Expected 1-3 values.`,
  invalidComponent: (
    axis: 'x' | 'y' | 'z',
    component: string | number,
    transformOrigin: TransformOrigin
  ) =>
    `Invalid ${axis}-axis value in transformOrigin ${JSON.stringify(transformOrigin)}. Passed value: ${component}.`,
};

const HORIZONTAL_CONVERSIONS: KeywordConversions = {
  left: 0,
  center: '50%',
  right: '100%',
} satisfies KeywordConversions;

const VERTICAL_CONVERSIONS = {
  top: 0,
  center: '50%',
  bottom: '100%',
} satisfies KeywordConversions;

const parseComponent: ComponentParser = (component, keywords) => {
  if (keywords && component in keywords) {
    return keywords[component];
  }
  if (typeof component === 'string' && component.endsWith('%')) {
    // Convert 0% to 0 (for consistency)
    return parseFloat(component) === 0 ? 0 : component;
  }

  // Try to convert to number or fallback to the original value
  const num = +component;
  if (!isNaN(num)) {
    return num;
  }
  return component;
};

const parseComponentWithPx: ComponentParser = (component, keywords) => {
  const parsed = parseComponent(component, keywords);
  if (typeof parsed !== 'string' || parsed.endsWith('%')) {
    return parsed;
  }
  // Use parseFloat to handle strip px suffix
  return parseFloat(parsed);
};

function validateComponents(
  parsed: (string | number)[],
  components: (string | number)[],
  transformOrigin: TransformOrigin
) {
  if (parsed.length < 1 || parsed.length > 3) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidTransformOrigin(transformOrigin)
    );
  }

  const [x, y, z] = parsed;

  if (typeof x === 'string' ? !x.endsWith('%') : isNaN(x)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidComponent('x', components[0], transformOrigin)
    );
  }
  if (typeof y === 'string' ? !y.endsWith('%') : isNaN(y)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidComponent('y', components[1], transformOrigin)
    );
  }
  if (typeof z !== 'number' || isNaN(z)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidComponent('z', components[2], transformOrigin)
    );
  }
}

export const processTransformOrigin: ValueProcessor<TransformOrigin> = (
  value
) => {
  let components: (string | number)[];
  let parse: ComponentParser;

  if (Array.isArray(value)) {
    components = value;
    parse = parseComponent;
  } else {
    components = value.split(/\s+/);
    parse = parseComponentWithPx;
  }

  // Swap x and y components if they are in the wrong order
  if (
    components[0] in VERTICAL_CONVERSIONS &&
    (components[1] === undefined || components[1] in HORIZONTAL_CONVERSIONS)
  ) {
    [components[0], components[1]] = [components[1], components[0]];
  }

  const parsed = [
    parse(components[0] ?? '50%', HORIZONTAL_CONVERSIONS),
    parse(components[1] ?? '50%', VERTICAL_CONVERSIONS),
    parse(components[2] ?? 0),
  ];

  if (__DEV__) {
    validateComponents(parsed, components, value);
  }

  return parsed;
};
