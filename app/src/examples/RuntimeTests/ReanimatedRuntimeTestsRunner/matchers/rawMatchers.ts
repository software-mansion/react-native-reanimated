import { color } from '../stringFormatUtils';
import { ComparisonMode, TestValue, TrackerCallCount } from '../types';
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

  const coloredExpected = color(expectedValue, 'green');
  const coloredReceived = color(currentValue, 'red');
  const coloredMode = color(comparisonMode, 'yellow');

  return {
    pass: isEqual(expectedValue, currentValue),
    message: `Expected${negation ? ' NOT' : ''} ${coloredExpected} received ${coloredReceived}, mode: ${coloredMode}`,
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

  const coloredExpected = color(`[${minimumValue}, ${maximumValue}]`, 'green');
  const coloredReceived = color(currentValue, 'red');

  return {
    pass: isWithinRange && validInputTypes,
    message: `Expected the value ${
      negation ? ' NOT' : ''
    }to be in range ${coloredExpected} received ${coloredReceived}`,
  };
};

export const toBeCalledMatcher: Matcher<ToBeCalledArgs> = (currentValue, negation, times) => {
  assertValueIsCallTracker(currentValue);
  const callsCount = currentValue.onUI + currentValue.onJS;
  const name = color(currentValue.name, 'green');
  const expected = color(times, 'green');
  const received = color(callsCount, 'red');
  return {
    pass: callsCount === times,
    message: `Expected ${name}${
      negation ? ' NOT' : ''
    } to be called ${expected} times, but was called ${received} times`,
  };
};

export const toBeCalledUIMatcher: Matcher<ToBeCalledArgs> = (currentValue, negation, times) => {
  assertValueIsCallTracker(currentValue);
  const callsCount = currentValue.onUI;
  const name = color(currentValue.name, 'green');
  const threadName = color('UI thread', 'cyan');
  const expected = color(times, 'green');
  const received = color(callsCount, 'red');

  return {
    pass: callsCount === times,
    message: `Expected ${name}${
      negation ? ' NOT' : ''
    } to be called ${expected} times on ${threadName}, but was called ${received} times`,
  };
};

export const toBeCalledJSMatcher: Matcher<ToBeCalledArgs> = (currentValue, negation, times) => {
  assertValueIsCallTracker(currentValue);
  const callsCount = currentValue.onJS;
  const name = color(currentValue.name, 'green');
  const threadName = color('JS thread', 'cyan');
  const expected = color(times, 'green');
  const received = color(callsCount, 'red');

  return {
    pass: callsCount === times,
    message: `Expected ${name}${
      negation ? ' NOT' : ''
    } to be called ${expected} times on ${threadName}, but was called ${received} times`,
  };
};
