import { cubicBezier, linear, steps } from '../../../../easings';
import type { CSSTimingFunction } from '../../../../easings';
import { ReanimatedError } from '../../../../errors';

type TimingFunctionArgument = number | string | (number | string)[];

type TimingFunction = CSSTimingFunction;

type TransitionBehavior = 'normal' | 'allow-discrete';

type Transition = {
  property?: string;
  duration?: number;
  timingFunction?: TimingFunction;
  delay?: number;
  behavior?: TransitionBehavior;
};

export function parseTransitionShorthand(value: string): Transition[] {
  return splitByComma(value).map(parseSingleTransitionShorthand);
}

function parseSingleTransitionShorthand(value: string): Transition {
  const transition: Transition = {};
  const parts = splitByWhitespace(value);
  for (const part of parts) {
    if (part === 'all') {
      transition.property = 'all';
      continue;
    }
    if (part === 'normal' || part === 'allow-discrete') {
      transition.behavior = parseTransitionBehavior(part);
      continue;
    }
    if (smellsLikeTimeUnit(part)) {
      const timeUnit = parseTimeUnit(part);
      if (transition.duration === undefined) {
        transition.duration = timeUnit;
        continue;
      }
      if (transition.delay === undefined) {
        transition.delay = timeUnit;
        continue;
      }
    }
    if (
      transition.timingFunction === undefined &&
      smellsLikeTimingFunction(part)
    ) {
      transition.timingFunction = parseTimingFunction(part);
      continue;
    }
    if (transition.property === undefined) {
      transition.property = kebabCaseToCamelCase(part);
      continue;
    }
    throw new ReanimatedError(`Invalid transition shorthand: ${value}`);
  }
  return transition;
}

function splitByComma(str: string) {
  // split by comma not enclosed in parentheses
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of str) {
    if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current.trim());
  return parts;
}

function splitByWhitespace(str: string) {
  // split by whitespace not enclosed in parentheses
  return str.split(/\s+(?![^()]*\))/);
}

function parseTransitionBehavior(value: string): TransitionBehavior {
  switch (value) {
    case 'allow-discrete':
    case 'normal':
      return value;
  }
  throw new ReanimatedError(`Unsupported transition behavior: ${value}`);
}

function kebabCaseToCamelCase(str: string) {
  return str.replace(/-./g, (x) => x[1].toUpperCase());
}

function smellsLikeTimingFunction(value: string) {
  // TODO: implement more strict check
  return [
    'ease',
    'ease-in',
    'ease-out',
    'ease-in-out',
    'linear',
    'step-start',
    'step-end',
    'steps',
    'cubic-bezier',
  ].includes(value.trim().split('(')[0]);
}

function smellsLikeTimeUnit(value: string) {
  // TODO: implement more strict check
  return /^-?(\d+)?(\.\d+)?(ms|s)$/.test(value);
}

function parseTimeUnit(value: string): number {
  // TODO: implement more strict check
  if (value.endsWith('ms')) {
    return parseFloat(value); // already in ms
  }
  if (value.endsWith('s')) {
    return parseFloat(value) * 1000; // convert to ms
  }
  throw new ReanimatedError(`Unsupported time unit: ${value}`);
}

function isFloat(str: string) {
  return str !== '' && /^-?\d*(\.\d+)?$/.test(str);
}

function isPercent(str: string) {
  return str.endsWith('%') && isFloat(str.slice(0, -1));
}

function parseTimingFunctionArgument(arg: string): TimingFunctionArgument {
  const parts = splitByWhitespace(arg);
  if (parts.length > 1) {
    return parts.map(parseTimingFunctionArgument) as TimingFunctionArgument;
  }
  if (isFloat(arg)) {
    return parseFloat(arg);
  }
  if (isPercent(arg)) {
    return arg;
  }
  // TODO: throw error for unsupported values
  return arg;
}

function parseTimingFunction(value: string): TimingFunction {
  switch (value) {
    case 'ease':
    case 'ease-in':
    case 'ease-out':
    case 'ease-in-out':
    case 'linear':
    case 'step-start':
    case 'step-end':
      return value;
  }

  // TODO: implement more strict check
  const regex = /^(.+)\((.+)\)$/;
  if (!regex.test(value)) {
    throw new ReanimatedError(`Unsupported timing function: ${value}`);
  }

  const [, name, args] = value.match(regex)!;

  const parsedArgs = splitByComma(args).map(parseTimingFunctionArgument);

  switch (name) {
    case 'cubic-bezier':
      // @ts-ignore blabla
      return cubicBezier(...parsedArgs);
    case 'linear':
      // @ts-ignore blabla
      return linear(...parsedArgs);
    case 'steps':
      // @ts-ignore blabla
      return steps(...parsedArgs);
    default:
      throw new ReanimatedError(`Unsupported timing function: ${value}`);
  }
}
