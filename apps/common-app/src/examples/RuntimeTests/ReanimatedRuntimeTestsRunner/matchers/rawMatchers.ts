import { cyan, green, red, yellow } from '../stringFormatUtils';
import type { TestValue, TrackerCallCount } from '../types';
import { ComparisonMode } from '../types';
import { getComparator } from './Comparators';

type ToBeArgs = [TestValue, ComparisonMode?];
type ToBeWithinRangeArgs = [number, number];
type ToBeCalledArgs = [number];

export type MatcherArguments = ToBeArgs | ToBeCalledArgs | ToBeWithinRangeArgs;

export type Matcher<Args extends MatcherArguments> = (
  currentValue: TestValue,
  negation: boolean,
  ...args: Args
) => {
  pass: boolean;
  message: string;
};

function assertValueIsCallTracker(value: TrackerCallCount | TestValue): asserts value is TrackerCallCount {
  if (typeof value !== 'object' || !(value !== null && 'name' in value && 'onJS' in value && 'onUI' in value)) {
    throw Error('Invalid value');
  }
}

export const toBeMatcher: Matcher<ToBeArgs> = (currentValue, negation, expectedValue, comparisonModeUnknown) => {
  const comparisonMode: ComparisonMode =
    typeof comparisonModeUnknown === 'string' && comparisonModeUnknown in ComparisonMode
      ? (comparisonModeUnknown as ComparisonMode)
      : ComparisonMode.AUTO;

  const isEqual = getComparator(comparisonMode);
  return {
    pass: isEqual(expectedValue, currentValue),
    message: `Expected${negation ? ' NOT' : ''} ${green(expectedValue)} received ${red(currentValue)}, mode: ${yellow(
      comparisonMode,
    )}`,
  };
};

export const toBeWithinRangeMatcher: Matcher<ToBeWithinRangeArgs> = (
  currentValue,
  negation,
  minimumValue,
  maximumValue,
) => {
  const currentValueAsNumber = Number(Number(currentValue));
  const validInputTypes = typeof minimumValue === 'number' && typeof maximumValue === 'number';
  const isWithinRange = Number(minimumValue) <= currentValueAsNumber && currentValueAsNumber <= Number(maximumValue);

  return {
    pass: isWithinRange && validInputTypes,
    message: `Expected the value ${negation ? ' NOT' : ''}to be in range ${green(
      `[${minimumValue}, ${maximumValue}]`,
    )} received ${red(currentValue)}`,
  };
};

const toBeCalledOnThreadMatcher = (
  currentValue: TestValue,
  negation: boolean,
  times: number,
  thread: 'ALL' | 'JS' | 'UI',
) => {
  assertValueIsCallTracker(currentValue);
  const { onUI, onJS } = currentValue;
  const callsCount = {
    ALL: onUI + onJS,
    JS: onJS,
    UI: onUI,
  }[thread];

  return {
    pass: callsCount === times,
    message: `Expected ${cyan(currentValue.name)}${negation ? ' NOT' : ''} to be called ${green(times)} times${
      thread === 'ALL' ? '' : cyan(` on ${thread} thread`)
    }, but was called ${red(callsCount)} times`,
  };
};

export const toBeCalledMatcher: Matcher<ToBeCalledArgs> = (currentValue, negation, times) => {
  return toBeCalledOnThreadMatcher(currentValue, negation, times, 'ALL');
};

export const toBeCalledUIMatcher: Matcher<ToBeCalledArgs> = (currentValue, negation, times) => {
  return toBeCalledOnThreadMatcher(currentValue, negation, times, 'UI');
};

export const toBeCalledJSMatcher: Matcher<ToBeCalledArgs> = (currentValue, negation, times) => {
  return toBeCalledOnThreadMatcher(currentValue, negation, times, 'JS');
};
